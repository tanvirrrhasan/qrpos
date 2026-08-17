'use client'

import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { Product } from '@/lib/types';
import { ArrowLeft, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { useReactToPrint } from 'react-to-print';

// A single QR Label component
const QRLabel = ({ product, showName, showPrice, showSKU, labelSize, qrMode, customUrlPattern }: { product: Product, showName: boolean, showPrice: boolean, showSKU: boolean, labelSize: string, qrMode: string, customUrlPattern: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (canvasRef.current) {
            let qrContent = `QRPOS::${product.sku}`; // Mode 1 default
            
            if (qrMode === '2') {
                const baseUrl = window.location.origin;
                qrContent = `${baseUrl}/p/${product.sku}`;
            } else if (qrMode === '3' && customUrlPattern) {
                qrContent = customUrlPattern.replace('{sku}', product.sku);
            }

            QRCode.toCanvas(canvasRef.current, qrContent, {
                width: labelSize === 'small' ? 70 : labelSize === 'medium' ? 100 : 130,
                margin: 1,
            });
        }
    }, [product.sku, labelSize, qrMode, customUrlPattern]);

    // Define dimensions based on size (in mm)
    // small: 30x20, medium: 50x30, large: 70x50
    const dims = labelSize === 'small' ? { w: '30mm', h: '20mm', f: '0.5rem' } 
               : labelSize === 'medium' ? { w: '50mm', h: '30mm', f: '0.7rem' } 
               : { w: '70mm', h: '50mm', f: '1rem' };

    return (
        <div style={{
            width: dims.w, 
            height: dims.h, 
            border: '1px dashed #ccc', // dashed border for cutting guide
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '2mm',
            boxSizing: 'border-box',
            pageBreakInside: 'avoid',
            background: 'white',
            overflow: 'hidden'
        }}>
            {showName && <div style={{fontSize: dims.f, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', textAlign: 'center'}}>{product.name}</div>}
            <canvas ref={canvasRef}></canvas>
            {showPrice && <div style={{fontSize: dims.f, fontWeight: 'bold'}}>৳ {product.selling_price}</div>}
            {showSKU && <div style={{fontSize: dims.f, color: '#666'}}>SKU: {product.sku}</div>}
        </div>
    );
};

export default function QRPrintPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    
    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];
    const qrMode = settings.find(s => s.setting_key === 'qr_config.mode')?.setting_value || '1';
    const customUrlPattern = settings.find(s => s.setting_key === 'qr_config.custom_url_pattern')?.setting_value || '';
    const [labelSize, setLabelSize] = useState('medium'); // small, medium, large
    const [copies, setCopies] = useState(1);
    const [showName, setShowName] = useState(true);
    const [showPrice, setShowPrice] = useState(true);
    const [showSKU, setShowSKU] = useState(true);
    const [sheetLayout, setSheetLayout] = useState<'A4' | 'Thermal58' | 'Thermal80'>('A4');

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            const idsStr = sessionStorage.getItem('qr_print_ids');
            if (idsStr) {
                const ids = JSON.parse(idsStr) as string[];
                const prods = await localDB.products.where('id').anyOf(ids).toArray();
                setProducts(prods);
            }
        };
        fetchProducts();
    }, []);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'QR_Labels',
    });

    // Generate array of labels based on copies
    const labelsToPrint = [];
    for (let p of products) {
        for (let i = 0; i < copies; i++) {
            labelsToPrint.push(p);
        }
    }

    return (
        <div style={{padding: '2rem', display: 'flex', gap: '2rem'}}>
            {/* Left Sidebar: Controls */}
            <div style={{flex: '0 0 350px', background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', height: 'fit-content'}}>
                <button onClick={() => router.back()} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem'}}>
                    <ArrowLeft size={16}/> Back
                </button>

                <h2 style={{marginBottom: '1.5rem'}}>Print Configuration</h2>

                <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Label Size</label>
                    <select value={labelSize} onChange={e => setLabelSize(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                        <option value="small">Small (30mm x 20mm)</option>
                        <option value="medium">Medium (50mm x 30mm)</option>
                        <option value="large">Large (70mm x 50mm)</option>
                    </select>
                </div>

                <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Printer Layout</label>
                    <select value={sheetLayout} onChange={e => setSheetLayout(e.target.value as any)} style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                        <option value="A4">A4 Sheet (Sticker Paper)</option>
                        <option value="Thermal58">58mm Thermal Printer</option>
                        <option value="Thermal80">80mm Thermal Printer</option>
                    </select>
                </div>

                <div style={{marginBottom: '1.5rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Copies per product</label>
                    <input type="number" min="1" max="100" value={copies} onChange={e => setCopies(Number(e.target.value))} style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}} />
                </div>

                <h3 style={{marginBottom: '1rem', fontSize: '1rem'}}>Include on Label</h3>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem'}}>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} /> Product Name
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} /> Price
                    </label>
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <input type="checkbox" checked={showSKU} onChange={e => setShowSKU(e.target.checked)} /> SKU
                    </label>
                </div>

                <button 
                    onClick={handlePrint as any}
                    style={{width: '100%', background: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: 'var(--radius)', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'}}
                >
                    <Printer /> Print {labelsToPrint.length} Labels
                </button>
            </div>

            {/* Right Side: Print Preview Container */}
            <div style={{flex: 1, background: '#f1f5f9', padding: '2rem', borderRadius: 'var(--radius)', overflow: 'auto', display: 'flex', justifyContent: 'center'}}>
                
                {/* Actual element to be printed */}
                <div 
                    ref={componentRef} 
                    style={{
                        background: 'white', 
                        padding: sheetLayout === 'A4' ? '10mm' : '0', 
                        width: sheetLayout === 'A4' ? '210mm' : sheetLayout === 'Thermal80' ? '80mm' : '58mm',
                        minHeight: sheetLayout === 'A4' ? '297mm' : 'auto',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignContent: 'flex-start',
                        gap: '2mm',
                        justifyContent: sheetLayout === 'A4' ? 'flex-start' : 'center',
                    }}
                >
                    {labelsToPrint.map((p, idx) => (
                        <QRLabel 
                            key={`${p.id}-${idx}`} 
                            product={p} 
                            showName={showName} 
                            showPrice={showPrice} 
                            showSKU={showSKU} 
                            labelSize={labelSize} 
                            qrMode={qrMode}
                            customUrlPattern={customUrlPattern}
                        />
                    ))}
                    {labelsToPrint.length === 0 && (
                        <div style={{width: '100%', textAlign: 'center', color: '#94a3b8', marginTop: '2rem'}}>No products selected for printing</div>
                    )}
                </div>

            </div>

            {/* Print Specific CSS to hide everything else and remove margins */}
            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { margin: 0; background: white; }
                }
            `}</style>
        </div>
    );
}
