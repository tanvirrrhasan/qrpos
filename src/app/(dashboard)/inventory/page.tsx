'use client'

import React, { useState, useEffect } from 'react';
import { X, History, Edit3, ChevronDown, ChevronRight, Image as ImageIcon } from 'lucide-react';
import styles from './inventory.module.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductVariant } from '@/lib/types';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function InventoryPage() {
    const { hasPermission } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    
    // Modals
    const [adjustModal, setAdjustModal] = useState<{ isOpen: boolean, product: Product | null, variant: ProductVariant | null }>({ isOpen: false, product: null, variant: null });
    const [historyModal, setHistoryModal] = useState<{ isOpen: boolean, product: Product | null, variant: ProductVariant | null }>({ isOpen: false, product: null, variant: null });

    // Adjust Form State
    const [adjType, setAdjType] = useState<'+'|'-'|'='>('+');
    const [adjQty, setAdjQty] = useState(0);
    const [adjReason, setAdjReason] = useState('Physical Count মেলানো');
    const [adjNotes, setAdjNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Fetch data
    const products = useLiveQuery(() => localDB.products.filter(p => p.is_active).toArray(), []) || [];
    const variants = useLiveQuery(() => localDB.productVariants.toArray(), []) || [];
    const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];
    const staffMembers = useLiveQuery(() => localDB.staff.toArray(), []) || [];
    const stockHistory = useLiveQuery(() => {
        if (!historyModal.product) return [];
        let q = localDB.stock_history.where('product_id').equals(historyModal.product.id);
        return q.toArray();
    }, [historyModal]) || [];

    const getStaffName = (staffId?: string) => {
        if (staffId) {
            const found = staffMembers.find(st => st.id === staffId || st.auth_user_id === staffId);
            if (found) return `${found.name} (${found.role})`;
        }
        const ownerStaff = staffMembers.find(st => st.role === 'owner');
        if (ownerStaff) return `${ownerStaff.name} (owner)`;
        return 'Owner Admin';
    };

    useEffect(() => {
        async function fetchAuth() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        }
        fetchAuth();
    }, []);

    // Derived stats
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    const inventoryData = products.map(p => {
        let currentStock = p.stock;
        let pValue = p.stock * p.purchase_price;
        
        const pVars = variants.filter(v => v.product_id === p.id);
        if (p.has_variants) {
            currentStock = pVars.reduce((sum, v) => sum + v.stock, 0);
            pValue = pVars.reduce((sum, v) => sum + (v.stock * v.purchase_price), 0);
        }

        totalValue += pValue;

        if (currentStock === 0) outOfStockCount++;
        else if (currentStock <= p.low_stock_alert) lowStockCount++;

        return { ...p, calculatedStock: currentStock, calculatedValue: pValue, variants: pVars };
    });

    const getCategoryName = (id?: string) => categories.find(c => c.id === id)?.name || 'Uncategorized';

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedRows(newSet);
    };

    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId || !adjustModal.product) return;
        if (adjQty < 0) return alert('Quantity cannot be negative');
        if (adjType !== '=' && adjQty === 0) return alert('Quantity must be greater than 0');

        setSaving(true);
        try {
            const product = adjustModal.product;
            const variant = adjustModal.variant;
            
            const currentStock = variant ? variant.stock : product.stock;
            let newStock = currentStock;
            let qtyChange = 0;

            if (adjType === '+') {
                newStock = currentStock + adjQty;
                qtyChange = adjQty;
            } else if (adjType === '-') {
                newStock = currentStock - adjQty;
                qtyChange = -adjQty;
                if (newStock < 0) throw new Error('Stock cannot be negative');
            } else if (adjType === '=') {
                newStock = adjQty;
                qtyChange = newStock - currentStock;
            }

            if (qtyChange === 0) {
                setAdjustModal({ isOpen: false, product: null, variant: null });
                setSaving(false);
                return;
            }

            const adjId = uuidv4();
            const histId = uuidv4();

            // Update Database
            if (variant) {
                await supabase.from('product_variants').update({ stock: newStock }).eq('id', variant.id);
                await localDB.productVariants.update(variant.id, { stock: newStock });
            } else {
                await supabase.from('products').update({ stock: newStock }).eq('id', product.id);
                await localDB.products.update(product.id, { stock: newStock });
            }

            // Record Adjustment
            const adjPayload = {
                id: adjId, store_id: storeId, product_id: product.id, variant_id: variant?.id || undefined,
                staff_id: userId || undefined, reason: adjReason, adjustment_type: adjType, quantity: adjQty, notes: adjNotes,
                created_at: new Date().toISOString()
            };
            await supabase.from('stock_adjustments').insert(adjPayload);
            await localDB.stock_adjustments.put(adjPayload);

            // Record History
            const histPayload = {
                id: histId, store_id: storeId, product_id: product.id, variant_id: variant?.id || undefined,
                action: 'adjustment', quantity_change: qtyChange, stock_before: currentStock, stock_after: newStock,
                staff_id: userId || undefined,
                notes: `${adjReason} - ${adjNotes}`, created_at: new Date().toISOString()
            };
            await supabase.from('stock_history').insert(histPayload);
            await localDB.stock_history.put(histPayload);

            // Record System Audit Activity Log
            const actPayload = {
                id: uuidv4(),
                store_id: storeId,
                staff_id: userId || undefined,
                action: 'stock_adjusted',
                entity_type: 'product',
                entity_id: product.id,
                details: {
                    product_name: product.name,
                    variant: variant?.variant_value || null,
                    type: adjType,
                    change: qtyChange,
                    stock_before: currentStock,
                    stock_after: newStock,
                    reason: adjReason
                },
                created_at: new Date().toISOString()
            };
            await localDB.activityLog.put(actPayload);
            try {
                await supabase.from('activity_logs').insert([actPayload]);
            } catch (e) {}

            setAdjustModal({ isOpen: false, product: null, variant: null });
            
            // Reset form
            setAdjType('+');
            setAdjQty(0);
            setAdjNotes('');
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Calculate new stock for UI preview
    let previewNewStock = 0;
    if (adjustModal.isOpen) {
        const current = adjustModal.variant ? adjustModal.variant.stock : adjustModal.product?.stock || 0;
        if (adjType === '+') previewNewStock = current + (Number(adjQty) || 0);
        if (adjType === '-') previewNewStock = current - (Number(adjQty) || 0);
        if (adjType === '=') previewNewStock = (Number(adjQty) || 0);
    }

    const filteredHistory = stockHistory
        .filter(h => historyModal.variant ? h.variant_id === historyModal.variant.id : (!h.variant_id || !historyModal.product?.has_variants))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (!hasPermission('can_manage_inventory')) {
        return (
            <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view inventory.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Inventory Management</h1>
            </div>

            <div className={styles.summaryGrid}>
                <div className={styles.card}>
                    <span className={styles.cardLabel}>মোট পণ্যের সংখ্যা (Active)</span>
                    <span className={styles.cardValue}>{products.length}</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardLabel}>মোট Stock Value</span>
                    <span className={styles.cardValue}>৳ {totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardLabel}>Low Stock Items</span>
                    <span className={styles.cardValue} style={{color: '#f59e0b'}}>{lowStockCount}</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardLabel}>Out of Stock Items</span>
                    <span className={styles.cardValue} style={{color: '#ef4444'}}>{outOfStockCount}</span>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{width: 30}}></th>
                            <th>Product Name</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th>Current Stock</th>
                            <th>Alert Level</th>
                            <th>Stock Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {inventoryData.map(item => (
                            <React.Fragment key={item.id}>
                                <tr>
                                    <td>
                                        {item.has_variants && (
                                            <button onClick={() => toggleRow(item.id)} style={{background: 'none', border:'none', cursor:'pointer', color:'var(--text-muted)'}}>
                                                {expandedRows.has(item.id) ? <ChevronDown size={20}/> : <ChevronRight size={20}/>}
                                            </button>
                                        )}
                                    </td>
                                    <td>
                                        <div className={styles.productInfo}>
                                            <div className={styles.thumbnail}>
                                                {item.thumbnail_url ? <img src={item.thumbnail_url} alt="" /> : <ImageIcon size={20} color="var(--text-muted)"/>}
                                            </div>
                                            <div className={styles.productName}>{item.name} {item.has_variants ? <span style={{fontSize:'0.75rem', fontWeight:'normal', color:'var(--text-muted)'}}>({item.variants.length} vars)</span> : ''}</div>
                                        </div>
                                    </td>
                                    <td>{item.sku || '-'}</td>
                                    <td>{getCategoryName(item.category_id)}</td>
                                    <td>
                                        <span className={item.calculatedStock === 0 ? styles.stockOut : item.calculatedStock <= item.low_stock_alert ? styles.stockLow : styles.stockGood}>
                                            {item.calculatedStock} {item.unit}
                                        </span>
                                    </td>
                                    <td>{item.low_stock_alert} {item.unit}</td>
                                    <td>৳ {item.calculatedValue.toFixed(2)}</td>
                                    <td>
                                        {!item.has_variants && (
                                            <div className={styles.actions}>
                                                <button className={styles.actionBtn} onClick={() => setAdjustModal({isOpen: true, product: item, variant: null})}><Edit3 size={14} style={{display:'inline', marginRight:4}}/> Adjust</button>
                                                <button className={styles.actionBtn} onClick={() => setHistoryModal({isOpen: true, product: item, variant: null})}><History size={14} style={{display:'inline', marginRight:4}}/> History</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                                
                                {item.has_variants && expandedRows.has(item.id) && item.variants.map(v => (
                                    <tr key={v.id} className={styles.variantRow}>
                                        <td></td>
                                        <td>↳ {item.name} - {v.variant_value}</td>
                                        <td>{v.sku}</td>
                                        <td></td>
                                        <td>
                                            <span className={v.stock === 0 ? styles.stockOut : v.stock <= item.low_stock_alert ? styles.stockLow : styles.stockGood}>
                                                {v.stock} {item.unit}
                                            </span>
                                        </td>
                                        <td>{item.low_stock_alert} {item.unit}</td>
                                        <td>৳ {(v.stock * v.purchase_price).toFixed(2)}</td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button className={styles.actionBtn} onClick={() => setAdjustModal({isOpen: true, product: item, variant: v as any})}><Edit3 size={14} style={{display:'inline', marginRight:4}}/> Adjust</button>
                                                <button className={styles.actionBtn} onClick={() => setHistoryModal({isOpen: true, product: item, variant: v as any})}><History size={14} style={{display:'inline', marginRight:4}}/> History</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Adjust Modal */}
            {adjustModal.isOpen && adjustModal.product && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Stock Adjustment</h2>
                            <button className={styles.closeBtn} onClick={() => setAdjustModal({isOpen:false, product:null, variant:null})}><X size={24}/></button>
                        </div>
                        <div className={styles.infoBox}>
                            <div style={{fontWeight: 600, marginBottom: '0.25rem'}}>
                                {adjustModal.product.name} {adjustModal.variant ? `- ${adjustModal.variant.variant_value}` : ''}
                            </div>
                            <div style={{color: 'var(--text-muted)', fontSize: '0.875rem'}}>
                                Current Stock: {adjustModal.variant ? adjustModal.variant.stock : adjustModal.product.stock} {adjustModal.product.unit}
                            </div>
                        </div>

                        <form onSubmit={handleAdjustSubmit}>
                            <div className={styles.formGroup}>
                                <label>Adjustment Type</label>
                                <div className={styles.radioGroup}>
                                    <label><input type="radio" checked={adjType==='+'} onChange={() => setAdjType('+')} /> Add (+)</label>
                                    <label><input type="radio" checked={adjType==='-'} onChange={() => setAdjType('-')} /> Remove (-)</label>
                                    <label><input type="radio" checked={adjType==='='} onChange={() => setAdjType('=')} /> Set Exact (=)</label>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Quantity</label>
                                <input type="number" step="0.001" min="0" value={adjQty} onChange={e => setAdjQty(Number(e.target.value))} required />
                                <div style={{marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)'}}>
                                    New Stock will be: <strong>{previewNewStock}</strong> {adjustModal.product.unit}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Reason</label>
                                <select value={adjReason} onChange={e => setAdjReason(e.target.value)} required>
                                    <option>Physical Count মেলানো</option>
                                    <option>পণ্য নষ্ট (Damage)</option>
                                    <option>পণ্য হারিয়ে গেছে (Loss)</option>
                                    <option>কাস্টমার ফেরত (Return)</option>
                                    <option>অন্যান্য (Other)</option>
                                </select>
                            </div>

                            <div className={styles.formGroup}>
                                <label>Notes</label>
                                <input type="text" value={adjNotes} onChange={e => setAdjNotes(e.target.value)} placeholder="Optional details..." />
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setAdjustModal({isOpen:false, product:null, variant:null})}>Cancel</button>
                                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save Adjust'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModal.isOpen && historyModal.product && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{maxWidth: 860}}>
                        <div className={styles.modalHeader}>
                            <h2>Stock History — {historyModal.product.name} {historyModal.variant ? `- ${historyModal.variant.variant_value}` : ''}</h2>
                            <button className={styles.closeBtn} onClick={() => setHistoryModal({isOpen:false, product:null, variant:null})}><X size={24}/></button>
                        </div>
                        
                        <table className={styles.historyTable}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Action</th>
                                    <th>Qty</th>
                                    <th>Stock After</th>
                                    <th style={{ whiteSpace: 'nowrap' }}>Adjusted By</th>
                                    <th>Ref / Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.length === 0 ? (
                                    <tr><td colSpan={6} style={{textAlign:'center', padding: '2rem'}}>No history found.</td></tr>
                                ) : null}
                                {filteredHistory.map(h => (
                                    <tr key={h.id}>
                                        <td style={{ whiteSpace: 'nowrap' }}>{new Date(h.created_at).toLocaleString()}</td>
                                        <td style={{textTransform: 'capitalize'}}>{h.action.replace('_', ' ')}</td>
                                        <td style={{color: h.quantity_change > 0 ? '#10b981' : h.quantity_change < 0 ? '#ef4444' : 'inherit', fontWeight:500}}>
                                            {h.quantity_change > 0 ? '+' : ''}{h.quantity_change}
                                        </td>
                                        <td>{h.stock_after}</td>
                                        <td style={{ whiteSpace: 'nowrap' }}><b style={{ color: 'var(--primary)' }}>👤 {getStaffName((h as any).staff_id)}</b></td>
                                        <td style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{h.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
