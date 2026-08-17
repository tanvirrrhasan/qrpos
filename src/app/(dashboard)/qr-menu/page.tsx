'use client'

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import styles from './qr.module.css';
import QRCode from 'qrcode';
import { Printer } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function QRMenuPage() {
    const { hasPermission } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Label Config
    const [labelSize, setLabelSize] = useState<'small'|'medium'|'large'>('medium');
    const [copies, setCopies] = useState(1);
    const [showName, setShowName] = useState(true);
    const [showPrice, setShowPrice] = useState(true);
    const [showSku, setShowSku] = useState(true);

    const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

    const products = useLiveQuery(() => localDB.products.filter(p => p.is_active).toArray(), []) || [];
    const variants = useLiveQuery(() => localDB.productVariants.toArray(), []) || [];

    useEffect(() => {
        async function fetchAuth() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
        }
        fetchAuth();
    }, []);

    // Generate flat list of printable items (products + variants)
    const printableItems = React.useMemo(() => {
        const items: any[] = [];
        products.forEach(p => {
            if (!p.has_variants) {
                items.push({ id: p.id, sku: p.sku || p.id.substring(0,8), name: p.name, price: p.selling_price });
            } else {
                const pVars = variants.filter(v => v.product_id === p.id);
                pVars.forEach(v => {
                    items.push({ id: v.id, sku: v.sku || v.id.substring(0,8), name: `${p.name} (${v.variant_value})`, price: v.selling_price });
                });
            }
        });
        return items;
    }, [products, variants]);

    // Pre-generate QR codes
    useEffect(() => {
        const generateAll = async () => {
            const urls: Record<string, string> = {};
            for (const item of printableItems) {
                // Using Mode 1: Text Only pattern for now. Can be dynamic from settings later.
                const content = `QRPOS::${item.sku}::${item.name}::${item.price}`;
                try {
                    urls[item.id] = await QRCode.toDataURL(content, { margin: 1, width: 200 });
                } catch(e) { console.error(e); }
            }
            setQrUrls(urls);
        };
        if (printableItems.length > 0) generateAll();
    }, [printableItems]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === printableItems.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(printableItems.map(i => i.id)));
    };

    const handlePrint = () => {
        window.print();
    };

    // Prepare array for printing (multiplying by copies)
    const printArray = [];
    for (const id of Array.from(selectedIds)) {
        const item = printableItems.find(i => i.id === id);
        if (item) {
            for (let c = 0; c < copies; c++) {
                printArray.push(item);
            }
        }
    }

    if (!hasPermission('can_manage_qr')) {
        return (
            <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to use the QR generator.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>QR Code Generator & Print</h1>
            </div>

            <div className={styles.controls}>
                <div className={styles.controlGroup}>
                    <label>Label Size</label>
                    <select value={labelSize} onChange={e => setLabelSize(e.target.value as any)}>
                        <option value="small">Small (30x20mm)</option>
                        <option value="medium">Medium (50x30mm)</option>
                        <option value="large">Large (70x50mm)</option>
                    </select>
                </div>
                <div className={styles.controlGroup}>
                    <label>Copies per Item</label>
                    <input type="number" min="1" max="100" value={copies} onChange={e => setCopies(Number(e.target.value))} style={{width: 80}} />
                </div>
                <div className={styles.controlGroup} style={{flexDirection: 'row', gap: '1rem', alignItems:'center', marginTop: '1.2rem'}}>
                    <label style={{display:'flex', gap:'0.25rem'}}><input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)}/> Show Name</label>
                    <label style={{display:'flex', gap:'0.25rem'}}><input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)}/> Show Price</label>
                    <label style={{display:'flex', gap:'0.25rem'}}><input type="checkbox" checked={showSku} onChange={e => setShowSku(e.target.checked)}/> Show SKU</label>
                </div>

                <button className={styles.printBtn} onClick={handlePrint} disabled={selectedIds.size === 0}>
                    <Printer size={18} style={{display:'inline', marginRight: '0.5rem', verticalAlign:'middle'}}/>
                    Print {selectedIds.size} Items
                </button>
            </div>

            <div style={{display:'flex', gap: '1rem', alignItems:'center', background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)'}}>
                <input type="checkbox" checked={selectedIds.size === printableItems.length && printableItems.length > 0} onChange={toggleSelectAll} style={{width: '1.2rem', height:'1.2rem'}} />
                <span style={{fontWeight: 600}}>Select All ({printableItems.length})</span>
            </div>

            <div className={styles.grid}>
                {printableItems.map(item => (
                    <div key={item.id} className={styles.productCard} onClick={() => toggleSelect(item.id)}>
                        <input type="checkbox" className={styles.checkbox} checked={selectedIds.has(item.id)} readOnly />
                        {qrUrls[item.id] ? (
                            <img src={qrUrls[item.id]} alt="QR" style={{width: 100, margin: '0 auto'}} />
                        ) : (
                            <div style={{width: 100, height: 100, background: '#eee', margin: '0 auto'}} />
                        )}
                        <div style={{textAlign: 'center', marginTop: '0.5rem'}}>
                            <div style={{fontWeight: 600, fontSize: '0.9rem'}}>{item.name}</div>
                            <div style={{color: 'var(--primary)', fontWeight: 600}}>৳ {item.price}</div>
                            <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>SKU: {item.sku}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Hidden Print Area */}
            <div className={styles.printArea}>
                {printArray.map((item, index) => (
                    <div key={`${item.id}-${index}`} className={`${styles.label} ${styles[`size-${labelSize}`]}`}>
                        <img src={qrUrls[item.id]} alt="QR" />
                        {showName && <div className={styles.labelName}>{item.name}</div>}
                        {showPrice && <div className={styles.labelPrice}>৳ {item.price}</div>}
                        {showSku && <div className={styles.labelSku}>SKU: {item.sku}</div>}
                    </div>
                ))}
            </div>
        </div>
    );
}
