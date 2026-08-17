'use client'

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer, Search, Plus, Minus, X } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import QRCode from 'qrcode';
import { useReactToPrint } from 'react-to-print';

interface LabelItem {
    id: string; // product or variant id
    name: string;
    sku: string;
    price: number;
    qty: number;
}

export default function LabelPrintingPage() {
    const [searchQ, setSearchQ] = useState('');
    const [selectedItems, setSelectedItems] = useState<LabelItem[]>([]);
    const [labelType, setLabelType] = useState<'thermal' | 'a4'>('thermal');
    const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
    
    const printRef = useRef<HTMLDivElement>(null);

    const products = useLiveQuery(() => localDB.products.toArray(), []) || [];

    // Filter products
    const filteredProducts = searchQ.trim() ? products.filter(p => p.name.toLowerCase().includes(searchQ.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQ.toLowerCase()))).slice(0, 5) : [];

    // Generate QR codes for selected items when they change
    useEffect(() => {
        selectedItems.forEach(async (item) => {
            if (!qrUrls[item.sku]) {
                try {
                    const url = await QRCode.toDataURL(item.sku || item.id, { margin: 1, width: 100 });
                    setQrUrls(prev => ({ ...prev, [item.sku]: url }));
                } catch (err) {
                    console.error('QR Generate Error', err);
                }
            }
        });
    }, [selectedItems, qrUrls]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: 'QR_Labels',
    });

    const addItem = (p: any) => {
        if (!p.sku) return alert("Product must have an SKU to generate a QR label.");
        const existing = selectedItems.find(i => i.id === p.id);
        if (existing) {
            setSelectedItems(selectedItems.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setSelectedItems([...selectedItems, { id: p.id, name: p.name, sku: p.sku, price: p.selling_price, qty: 1 }]);
        }
        setSearchQ('');
    };

    const updateQty = (id: string, delta: number) => {
        setSelectedItems(selectedItems.map(i => {
            if (i.id === id) {
                const newQty = Math.max(1, i.qty + delta);
                return { ...i, qty: newQty };
            }
            return i;
        }));
    };

    const removeItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    // Prepare array of elements based on qty
    const labelsToPrint: LabelItem[] = [];
    selectedItems.forEach(item => {
        for (let i = 0; i < item.qty; i++) {
            labelsToPrint.push(item);
        }
    });

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem', height: 'calc(100vh - 70px)' }}>
            
            {/* Left side: Controls */}
            <div style={{ flex: '0 0 350px', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRight: '1px solid var(--border)', paddingRight: '2rem', overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/products" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={18} /></Link>
                    <h2>Print Labels</h2>
                </div>

                {/* Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Label Size Format</label>
                    <select value={labelType} onChange={e => setLabelType(e.target.value as 'thermal' | 'a4')} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)' }}>
                        <option value="thermal">Thermal Printer (1.5" x 1")</option>
                        <option value="a4">A4 Sticker Sheet (Grid)</option>
                    </select>
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                    <input 
                        type="text" 
                        placeholder="Search product to print..." 
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.2rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)' }}
                    />
                    {filteredProducts.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', zIndex: 10, borderRadius: '4px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                            {filteredProducts.map(p => (
                                <div key={p.id} onClick={() => addItem(p)} style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{p.name}</span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{p.sku || 'No SKU'}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Items */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {selectedItems.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem' }}>No products selected</p>}
                    
                    {selectedItems.map(item => (
                        <div key={item.id} style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{item.name}</div>
                                <button onClick={() => removeItem(item.id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>SKU: {item.sku}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600 }}>৳ {item.price}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                                    <button onClick={() => updateQty(item.id, -1)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}><Minus size={14}/></button>
                                    <span style={{ fontSize: '0.9rem', width: '20px', textAlign: 'center' }}>{item.qty}</span>
                                    <button onClick={() => updateQty(item.id, 1)} style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer' }}><Plus size={14}/></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button 
                    onClick={() => handlePrint()} 
                    disabled={selectedItems.length === 0}
                    style={{ width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed', opacity: selectedItems.length > 0 ? 1 : 0.5 }}
                >
                    <Printer size={18} /> Print {labelsToPrint.length} Labels
                </button>
            </div>

            {/* Right side: Print Preview */}
            <div style={{ flex: 1, background: '#e5e7eb', padding: '2rem', overflowY: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                {labelsToPrint.length > 0 ? (
                    <div 
                        ref={printRef} 
                        style={{ 
                            background: 'white', 
                            width: labelType === 'a4' ? '210mm' : 'auto', 
                            minHeight: labelType === 'a4' ? '297mm' : 'auto', 
                            padding: labelType === 'a4' ? '15mm' : '0', 
                            boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                            display: 'flex',
                            flexWrap: labelType === 'a4' ? 'wrap' : 'nowrap',
                            flexDirection: labelType === 'thermal' ? 'column' : 'row',
                            gap: labelType === 'a4' ? '10mm' : '0',
                            alignContent: 'flex-start'
                        }}
                    >
                        {labelsToPrint.map((item, idx) => (
                            <div key={idx} style={{ 
                                width: labelType === 'thermal' ? '1.5in' : '38mm', 
                                height: labelType === 'thermal' ? '1in' : '25mm',
                                border: labelType === 'a4' ? '1px dashed #ccc' : 'none',
                                pageBreakInside: 'avoid',
                                pageBreakAfter: labelType === 'thermal' ? 'always' : 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px',
                                overflow: 'hidden',
                                boxSizing: 'border-box'
                            }}>
                                <div style={{ fontSize: '7pt', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', color: 'black' }}>
                                    {item.name}
                                </div>
                                {qrUrls[item.sku] && (
                                    <img src={qrUrls[item.sku]} alt="QR" style={{ width: '0.65in', height: '0.65in', objectFit: 'contain' }} />
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 2px', fontSize: '6pt', color: 'black' }}>
                                    <span>{item.sku}</span>
                                    <span style={{ fontWeight: 'bold' }}>৳{item.price}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: '#6b7280', fontSize: '1.2rem' }}>Select products to preview labels</div>
                )}
            </div>

            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        margin: 0;
                        size: ${labelType === 'thermal' ? '1.5in 1in' : 'A4'};
                    }
                    body {
                        background: white !important;
                    }
                }
            `}</style>
        </div>
    );
}
