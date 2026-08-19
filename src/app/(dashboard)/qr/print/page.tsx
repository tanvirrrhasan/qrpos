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
const QRLabel = ({ 
    product, 
    showName, 
    showPrice, 
    showSKU, 
    labelSize, 
    customScale,
    heightMode,
    fixedWidth,
    fixedHeight,
    labelLayout, 
    qrMode, 
    customUrlPattern 
}: { 
    product: Product, 
    showName: boolean, 
    showPrice: boolean, 
    showSKU: boolean, 
    labelSize: string, 
    customScale: number,
    heightMode: 'fixed' | 'auto', 
    fixedWidth: number,
    fixedHeight: number,
    labelLayout: 'qr-top' | 'qr-bottom' | 'qr-left' | 'qr-right', 
    qrMode: string, 
    customUrlPattern: string 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const scaleMultiplier = labelSize === 'custom' ? (customScale / 100) : 1.0;

    const getBaseDims = () => {
        if (labelSize === 'small') return { w: 30, h: 20, fName: 7.5, fText: 7 };
        if (labelSize === 'medium') return { w: 50, h: 30, fName: 10, fText: 9 };
        if (labelSize === 'large') return { w: 70, h: 50, fName: 13, fText: 12 };
        return { w: 50, h: 30, fName: 10, fText: 9 };
    };

    const baseDims = getBaseDims();
    const fontScale = scaleMultiplier;

    // Calculate dimensions
    const widthMm = (heightMode === 'fixed' ? (fixedWidth || baseDims.w) : baseDims.w) * scaleMultiplier;
    const heightMm = (heightMode === 'fixed' ? (fixedHeight || baseDims.h) : baseDims.h) * scaleMultiplier;

    const dims = {
        w: widthMm,
        h: heightMm,
        fName: `${(baseDims.fName * fontScale).toFixed(1)}px`,
        fText: `${(baseDims.fText * fontScale).toFixed(1)}px`
    };

    const isSideBySide = labelLayout === 'qr-left' || labelLayout === 'qr-right';

    // Compute QR code width dynamically
    let qrWidth = 80;
    if (isSideBySide) {
        if (heightMode === 'fixed') {
            qrWidth = Math.max(30, Math.min(dims.w * 2.2, dims.h * 2.8 - 6));
        } else {
            qrWidth = 75 * fontScale;
        }
    } else {
        const activeTextCount = (showName ? 1 : 0) + ((showPrice || showSKU) ? 1 : 0);
        if (heightMode === 'auto') {
            const baseAutoQr = activeTextCount >= 2 ? 65 : activeTextCount === 1 ? 75 : 85;
            qrWidth = Math.max(35, baseAutoQr * fontScale);
        } else {
            const textDeduction = activeTextCount >= 2 ? (30 * fontScale) : activeTextCount === 1 ? (16 * fontScale) : 4;
            const availableHeightPx = (dims.h * 3.78) - textDeduction;
            qrWidth = Math.max(30, Math.min(dims.w * 2.5, availableHeightPx));
        }
    }

    useEffect(() => {
        if (canvasRef.current) {
            let qrContent = `QRPOS::${product.sku}`; // Mode 1 default
            
            if (qrMode === '2' || qrMode === 'App Page' || qrMode === 'Direct Product Page') {
                const baseUrl = window.location.origin;
                qrContent = `${baseUrl}/p?sku=${product.sku}`;
            } else if ((qrMode === '3' || qrMode === 'Custom URL') && customUrlPattern) {
                let pattern = customUrlPattern;
                if (!pattern.includes('{sku}') && !pattern.includes('{id}')) {
                    pattern = pattern.endsWith('/') ? `${pattern}{sku}` : `${pattern}/{sku}`;
                }
                qrContent = pattern.replace('{sku}', product.sku).replace('{id}', product.sku);
            }

            QRCode.toCanvas(canvasRef.current, qrContent, {
                width: Math.round(qrWidth),
                margin: 0,
            });
        }
    }, [product.sku, labelSize, customScale, fixedWidth, fixedHeight, qrMode, customUrlPattern, qrWidth]);

    const renderTextGroup = () => (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: isSideBySide ? 'flex-start' : 'center', 
            justifyContent: 'center', 
            maxWidth: '100%', 
            overflow: 'hidden', 
            flex: isSideBySide ? 1 : undefined,
            padding: '1px 0',
            lineHeight: 1.2
        }}>
            {showName && (
                <div style={{ 
                    fontSize: dims.fName, 
                    fontWeight: 'bold', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap', 
                    maxWidth: '100%', 
                    color: '#000000',
                    paddingTop: '1px',
                    paddingBottom: '1px'
                }}>
                    {product.name}
                </div>
            )}
            {(showPrice || showSKU) && (
                <div style={{ 
                    display: 'flex', 
                    gap: '5px', 
                    alignItems: 'center', 
                    justifyContent: isSideBySide ? 'flex-start' : 'center', 
                    marginTop: '1px', 
                    paddingTop: '1px',
                    paddingBottom: '1px',
                    maxWidth: '100%', 
                    overflow: 'hidden' 
                }}>
                    {showPrice && <span style={{ fontSize: dims.fText, fontWeight: 'bold', color: '#000000' }}>৳ {product.selling_price}</span>}
                    {showPrice && showSKU && <span style={{ fontSize: '75%', color: '#64748b' }}>|</span>}
                    {showSKU && <span style={{ fontSize: dims.fText, color: '#334155', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>SKU: {product.sku}</span>}
                </div>
            )}
        </div>
    );

    return (
        <div style={{
            width: heightMode === 'fixed' ? `${dims.w}mm` : 'auto', 
            minWidth: heightMode === 'auto' ? `${dims.w * 0.7}mm` : undefined,
            height: heightMode === 'fixed' ? `${dims.h}mm` : 'auto',
            border: '1px dashed #94a3b8', 
            display: 'flex', 
            flexDirection: isSideBySide ? (labelLayout === 'qr-left' ? 'row' : 'row-reverse') : (labelLayout === 'qr-top' ? 'column' : 'column-reverse'), 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '1.5mm 2mm',
            gap: isSideBySide ? '2mm' : '1mm',
            boxSizing: 'border-box',
            pageBreakInside: 'avoid',
            background: '#ffffff',
            color: '#000000',
            overflow: 'hidden',
        }}>
            <canvas ref={canvasRef} style={{ display: 'block', flexShrink: 0 }}></canvas>
            {renderTextGroup()}
        </div>
    );
};

export default function QRPrintPage() {
    const router = useRouter();
    const [products, setProducts] = useState<Product[]>([]);
    
    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];

    // Helper to safely extract qr_config values whether stored as dot keys or JSON object
    const getQrSetting = (key: string): string | null => {
        if (!settings || settings.length === 0) return null;

        // 1. Check dot key e.g. 'qr_config.mode'
        const dotItem = settings.find(s => s.setting_key === `qr_config.${key}`);
        if (dotItem?.setting_value !== undefined && dotItem?.setting_value !== null) {
            return String(dotItem.setting_value);
        }

        // 2. Check main 'qr_config' JSON object or string
        const mainItem = settings.find(s => s.setting_key === 'qr_config');
        if (mainItem?.setting_value) {
            try {
                const val = typeof mainItem.setting_value === 'string' ? JSON.parse(mainItem.setting_value) : mainItem.setting_value;
                if (val && val[key] !== undefined && val[key] !== null) {
                    return String(val[key]);
                }
            } catch (e) {
                console.error('Error parsing qr_config setting:', e);
            }
        }
        return null;
    };

    const qrMode = getQrSetting('mode') || '1';
    const customUrlPattern = getQrSetting('custom_url_pattern') || getQrSetting('urlPattern') || '';
    
    const [labelSize, setLabelSize] = useState('medium'); // small, medium, large, custom
    const [customScale, setCustomScale] = useState(100); // 50% to 250% slider
    const [heightMode, setHeightMode] = useState<'fixed' | 'auto'>('auto');
    const [fixedWidth, setFixedWidth] = useState(50);
    const [fixedHeight, setFixedHeight] = useState(30);
    const [labelLayout, setLabelLayout] = useState<'qr-top' | 'qr-bottom' | 'qr-left' | 'qr-right'>('qr-top');
    const [copyMode, setCopyMode] = useState<'manual' | 'stock' | 'individual'>('manual');
    const [copies, setCopies] = useState(1);
    const [customProductCopies, setCustomProductCopies] = useState<Record<string, number>>({});
    const [showName, setShowName] = useState(true);
    const [showPrice, setShowPrice] = useState(true);
    const [showSKU, setShowSKU] = useState(true);
    const [sheetLayout, setSheetLayout] = useState<'A4' | 'Thermal58' | 'Thermal80'>('A4');

    // Helper to persist print configuration dynamically into database
    const saveConfigSetting = async (key: string, val: string) => {
        try {
            await localDB.settings.put({
                id: `qr_config.${key}`,
                setting_key: `qr_config.${key}`,
                setting_value: val,
                updated_at: new Date().toISOString()
            });
        } catch (e) {
            console.error('Failed to auto-save QR setting:', e);
        }
    };

    // Auto-sync initial state from saved DB settings
    useEffect(() => {
        if (settings && settings.length > 0) {
            const savedSize = settings.find(s => s.setting_key === 'qr_config.size')?.setting_value;
            if (savedSize && ['small', 'medium', 'large', 'custom'].includes(savedSize.toLowerCase())) {
                setLabelSize(savedSize.toLowerCase());
            }

            const savedHeightMode = settings.find(s => s.setting_key === 'qr_config.heightMode')?.setting_value;
            if (savedHeightMode && ['fixed', 'auto'].includes(savedHeightMode)) {
                setHeightMode(savedHeightMode as any);
            }

            const savedLayout = settings.find(s => s.setting_key === 'qr_config.layout')?.setting_value;
            if (savedLayout && ['qr-top', 'qr-bottom', 'qr-left', 'qr-right'].includes(savedLayout)) {
                setLabelLayout(savedLayout as any);
            }

            const savedSheet = settings.find(s => s.setting_key === 'qr_config.sheetLayout')?.setting_value;
            if (savedSheet && ['A4', 'Thermal58', 'Thermal80'].includes(savedSheet)) {
                setSheetLayout(savedSheet as any);
            }

            const savedShowPrice = settings.find(s => s.setting_key === 'qr_config.showPrice')?.setting_value;
            if (savedShowPrice !== undefined) {
                setShowPrice(savedShowPrice === 'true');
            }

            const savedShowSku = settings.find(s => s.setting_key === 'qr_config.showSku')?.setting_value;
            if (savedShowSku !== undefined) {
                setShowSKU(savedShowSku === 'true');
            }
        }
    }, [settings]);

    const componentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            const idsStr = sessionStorage.getItem('qr_print_ids');
            if (idsStr) {
                const ids = JSON.parse(idsStr) as string[];
                let prods = await localDB.products.where('id').anyOf(ids).toArray();
                if (prods.length < ids.length) {
                    const foundIds = new Set(prods.map(p => p.id));
                    const missingIds = ids.filter(id => !foundIds.has(id));
                    const vars = await localDB.productVariants.where('id').anyOf(missingIds).toArray();
                    for (const v of vars) {
                        const parentProd = await localDB.products.get(v.product_id);
                        prods.push({
                            id: v.id,
                            store_id: v.store_id,
                            name: parentProd ? `${parentProd.name} (${v.variant_value})` : v.variant_value,
                            sku: v.sku,
                            unit: parentProd?.unit || 'pcs',
                            purchase_price: v.purchase_price,
                            selling_price: v.selling_price,
                            stock: v.stock,
                            low_stock_alert: v.low_stock_alert,
                            has_variants: false,
                            is_active: v.is_active,
                            created_at: v.created_at,
                            updated_at: v.updated_at
                        } as Product);
                    }
                }
                setProducts(prods);
            }
        };
        fetchProducts();
    }, []);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: 'QR_Labels',
    });

    const labelsToPrint = [];
    for (let p of products) {
        let count = 1;
        if (copyMode === 'manual') {
            count = copies;
        } else if (copyMode === 'stock') {
            count = Math.max(1, p.stock || 1);
        } else if (copyMode === 'individual') {
            count = customProductCopies[p.id] !== undefined ? customProductCopies[p.id] : 1;
        }
        for (let i = 0; i < count; i++) {
            labelsToPrint.push(p);
        }
    }

    return (
        <div style={{ padding: '2rem', display: 'flex', gap: '2rem' }}>
            <div style={{ flex: '0 0 350px', background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', height: 'fit-content' }}>
                <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                    <ArrowLeft size={16} /> Back
                </button>

                <h2 style={{ marginBottom: '1.5rem' }}>Print Configuration</h2>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Label Size</label>
                    <select value={labelSize} onChange={e => { setLabelSize(e.target.value); saveConfigSetting('size', e.target.value); }} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="custom">Custom Scale</option>
                    </select>
                </div>

                {labelSize === 'custom' && (
                    <div style={{ marginBottom: '1rem', background: 'var(--background)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Sticker Size Scale:</label>
                            <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.9rem' }}>{customScale}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="50" 
                            max="250" 
                            step="5"
                            value={customScale} 
                            onChange={e => setCustomScale(Number(e.target.value))} 
                            style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--primary)' }} 
                        />
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Label Boundary Constraint</label>
                    <select value={heightMode} onChange={e => { setHeightMode(e.target.value as any); saveConfigSetting('heightMode', e.target.value); }} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <option value="fixed">Fixed Boundary (Specific Width & Height)</option>
                        <option value="auto">Auto Content Boundary (Hug QR & Text)</option>
                    </select>
                </div>

                {heightMode === 'fixed' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem', background: 'var(--background)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Fixed Width (mm)</label>
                            <input type="number" min="15" max="200" value={fixedWidth} onChange={e => setFixedWidth(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>Fixed Height (mm)</label>
                            <input type="number" min="10" max="200" value={fixedHeight} onChange={e => setFixedHeight(Number(e.target.value))} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }} />
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Layout Arrangement</label>
                    <select value={labelLayout} onChange={e => { setLabelLayout(e.target.value as any); saveConfigSetting('layout', e.target.value); }} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <option value="qr-top">QR Top, Details Below (Recommended)</option>
                        <option value="qr-bottom">Details Top, QR Below</option>
                        <option value="qr-left">Side-by-Side (QR Left, Details Right)</option>
                        <option value="qr-right">Side-by-Side (Details Left, QR Right)</option>
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Printer Layout</label>
                    <select value={sheetLayout} onChange={e => { setSheetLayout(e.target.value as any); saveConfigSetting('sheetLayout', e.target.value); }} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <option value="A4">A4 Sheet (Sticker Paper)</option>
                        <option value="Thermal58">58mm Thermal Printer</option>
                        <option value="Thermal80">80mm Thermal Printer</option>
                    </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Label Copy Mode</label>
                    <select value={copyMode} onChange={e => setCopyMode(e.target.value as any)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                        <option value="manual">Fixed Copies (Same for all products)</option>
                        <option value="stock">Auto Stock Quantity (Equal to Product Stock)</option>
                        <option value="individual">Custom Copy per Selected Product</option>
                    </select>
                </div>

                {copyMode === 'manual' && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Copies per product</label>
                        <input type="number" min="1" max="500" value={copies} onChange={e => setCopies(Math.max(1, Number(e.target.value)))} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                    </div>
                )}

                {copyMode === 'stock' && (
                    <div style={{ marginBottom: '1.5rem', background: '#e0f2fe', color: '#0369a1', padding: '0.75rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', lineHeight: 1.4 }}>
                        💡 Auto-printing copies equal to current stock of each product.
                    </div>
                )}

                {copyMode === 'individual' && (
                    <div style={{ marginBottom: '1.5rem', background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', maxHeight: '180px', overflowY: 'auto' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Product Copies Breakdown:</label>
                        {products.map((p, idx) => (
                            <div key={`${p.id}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>{p.name} (Stock: {p.stock})</span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="500" 
                                    value={customProductCopies[p.id] !== undefined ? customProductCopies[p.id] : 1} 
                                    onChange={e => setCustomProductCopies({ ...customProductCopies, [p.id]: Math.max(1, Number(e.target.value)) })}
                                    style={{ width: '65px', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Include on Label</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showName} onChange={e => { setShowName(e.target.checked); saveConfigSetting('showName', String(e.target.checked)); }} /> Product Name
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showPrice} onChange={e => { setShowPrice(e.target.checked); saveConfigSetting('showPrice', String(e.target.checked)); }} /> Price
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input type="checkbox" checked={showSKU} onChange={e => { setShowSKU(e.target.checked); saveConfigSetting('showSku', String(e.target.checked)); }} /> SKU
                    </label>
                </div>

                <div style={{
                    background: 'var(--background)',
                    padding: '1rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                }}>
                    <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Print Summary</h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>Total Products:</span>
                        <strong style={{ color: 'var(--text)' }}>{products.length} Items</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span>Total Labels / Copies:</span>
                        <strong style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>{labelsToPrint.length} Pcs</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <span>Paper Format:</span>
                        <span>{sheetLayout === 'A4' ? 'A4 Sticker Sheet' : sheetLayout === 'Thermal58' ? '58mm Thermal' : '80mm Thermal'}</span>
                    </div>
                </div>

                <button
                    onClick={handlePrint as any}
                    style={{ width: '100%', background: 'var(--primary)', color: 'white', padding: '1rem', borderRadius: 'var(--radius)', border: 'none', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Printer /> Print {labelsToPrint.length} Labels
                </button>
            </div>

            <div style={{ flex: 1, background: '#f1f5f9', padding: '2rem', borderRadius: 'var(--radius)', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                <div
                    ref={componentRef}
                    style={{
                        background: 'white',
                        padding: sheetLayout === 'A4' ? '5mm 3mm' : '0',
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
                            customScale={customScale}
                            heightMode={heightMode}
                            fixedWidth={fixedWidth}
                            fixedHeight={fixedHeight}
                            labelLayout={labelLayout}
                            qrMode={qrMode}
                            customUrlPattern={customUrlPattern}
                        />
                    ))}
                    {labelsToPrint.length === 0 && (
                        <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>No products selected for printing</div>
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
