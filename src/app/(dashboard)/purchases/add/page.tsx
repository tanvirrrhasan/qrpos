'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Search, Plus, Trash, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function AddPurchasePage() {
    const router = useRouter();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    
    // Form State
    const [supplierId, setSupplierId] = useState('');
    const [referenceNo, setReferenceNo] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    
    // Items State
    const [items, setItems] = useState<any[]>([]);
    const [productSearch, setProductSearch] = useState('');
    
    // Payment State
    const [discount, setDiscount] = useState(0);
    const [tax, setTax] = useState(0);
    const [paidAmount, setPaidAmount] = useState<number | ''>('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentRef, setPaymentRef] = useState('');
    
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        async function fetchAuth() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        }
        fetchAuth();
    }, []);

    // Fetch Data
    const suppliers = useLiveQuery(() => localDB.suppliers.toArray()) || [];
    const products = useLiveQuery(
        () => {
            if (productSearch.length > 1) {
                return localDB.products
                    .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.sku.toLowerCase().includes(productSearch.toLowerCase()))
                    .limit(10)
                    .toArray();
            }
            return [];
        },
        [productSearch]
    ) || [];

    // Calculations
    const subtotal = useMemo(() => items.reduce((acc, item) => acc + (item.qty * item.price), 0), [items]);
    const total = useMemo(() => subtotal - discount + tax, [subtotal, discount, tax]);
    const dueAmount = useMemo(() => Math.max(0, total - Number(paidAmount || 0)), [total, paidAmount]);

    const handleAddItem = (product: any) => {
        const exists = items.find(i => i.product_id === product.id);
        if (exists) {
            setItems(items.map(i => i.product_id === product.id ? { ...i, qty: i.qty + 1 } : i));
        } else {
            setItems([...items, {
                id: uuidv4(),
                product_id: product.id,
                name: product.name,
                qty: 1,
                price: product.purchase_price || 0,
            }]);
        }
        setProductSearch('');
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleItemChange = (id: string, field: 'qty' | 'price', value: number) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSavePurchase = async () => {
        if (!storeId) return;
        if (!supplierId) return alert('Please select a supplier');
        if (items.length === 0) return alert('Please add at least one item');
        if (Number(paidAmount || 0) > total) return alert('Paid amount cannot exceed total');

        setProcessing(true);
        try {
            const purchaseId = uuidv4();
            const dateStr = new Date(purchaseDate).toISOString();
            const paid = Number(paidAmount || 0);
            const status = paid === total ? 'paid' : (paid > 0 ? 'partial' : 'due');

            // 1. Create Purchase
            const purchaseData = {
                id: purchaseId,
                store_id: storeId,
                supplier_id: supplierId,
                reference_no: referenceNo,
                staff_id: userId || undefined,
                subtotal,
                discount_amount: discount,
                tax_amount: tax,
                total,
                paid_amount: paid,
                due_amount: dueAmount,
                payment_status: status as any,
                notes,
                purchase_date: dateStr,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_synced: false
            };
            await localDB.purchases.put(purchaseData);

            // 2. Process Items & Update Stock
            for (const item of items) {
                const itemTotal = item.qty * item.price;
                await localDB.purchaseItems.put({
                    id: uuidv4(),
                    store_id: storeId,
                    purchase_id: purchaseId,
                    product_id: item.product_id,
                    product_name: item.name,
                    unit_price: item.price,
                    quantity: item.qty,
                    total: itemTotal,
                    created_at: new Date().toISOString()
                });

                // Update product stock and optionally purchase_price
                const product = await localDB.products.get(item.product_id);
                if (product) {
                    const newStock = product.stock + item.qty;
                    await localDB.products.update(product.id, { 
                        stock: newStock,
                        purchase_price: item.price // Update latest purchase price
                    });

                    // Log stock history
                    await localDB.stock_history.put({
                        id: uuidv4(),
                        store_id: storeId,
                        product_id: item.product_id,
                        action: 'purchase',
                        quantity_change: item.qty,
                        stock_before: product.stock,
                        stock_after: newStock,
                        notes: `Purchased via ${referenceNo || purchaseId}`,
                        ref_id: purchaseId,
                        created_at: new Date().toISOString()
                    });
                }
            }

            // 3. Update Supplier Due
            if (dueAmount > 0) {
                const supplier = await localDB.suppliers.get(supplierId);
                if (supplier) {
                    await localDB.suppliers.update(supplierId, {
                        total_due: supplier.total_due + dueAmount,
                        total_purchases: (supplier.total_purchases || 0) + total
                    });
                }
            } else {
                const supplier = await localDB.suppliers.get(supplierId);
                if (supplier) {
                    await localDB.suppliers.update(supplierId, {
                        total_purchases: (supplier.total_purchases || 0) + total
                    });
                }
            }

            // 4. Record Supplier Payment if paid > 0
            if (paid > 0) {
                await localDB.supplierPayments.put({
                    id: uuidv4(),
                    store_id: storeId,
                    supplier_id: supplierId,
                    purchase_id: purchaseId,
                    amount: paid,
                    payment_method: paymentMethod,
                    reference_no: paymentRef,
                    paid_by: userId || undefined,
                    payment_date: dateStr,
                    created_at: new Date().toISOString()
                });
            }

            // 5. Activity Log
            await localDB.activityLog.put({
                id: uuidv4(),
                store_id: storeId,
                staff_id: userId || undefined,
                action: 'purchase_created',
                entity_type: 'purchase',
                entity_id: purchaseId,
                details: { total, supplierId },
                created_at: new Date().toISOString()
            });

            alert('Purchase saved successfully!');
            router.push('/purchases');

        } catch (err: any) {
            console.error(err);
            alert('Error saving purchase: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem'}}>
                <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)'}}>
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{margin: 0, fontSize: '1.5rem'}}>Add Purchase / Stock-In</h1>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem'}}>
                
                {/* Left Column: Items and Details */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    
                    {/* Basic Info */}
                    <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                        <h2 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Purchase Information</h2>
                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                            <div>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Supplier *</label>
                                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}}>
                                    <option value="">Select Supplier</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} {s.company_name ? `(${s.company_name})` : ''}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Date *</label>
                                <input type="datetime-local" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                            </div>
                            <div>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Reference No</label>
                                <input type="text" value={referenceNo} onChange={e => setReferenceNo(e.target.value)} placeholder="e.g. Invoice #, Bill #" style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                            </div>
                        </div>
                    </div>

                    {/* Product Selection */}
                    <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                        <h2 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Add Products</h2>
                        <div style={{position: 'relative', marginBottom: '1.5rem'}}>
                            <div style={{display: 'flex', alignItems: 'center', background: 'var(--background)', border: '1px solid var(--primary)', borderRadius: '4px', padding: '0.5rem 1rem'}}>
                                <Search size={18} style={{color: 'var(--primary)', marginRight: '0.5rem'}} />
                                <input 
                                    type="text" 
                                    placeholder="Search product by name or SKU..." 
                                    value={productSearch}
                                    onChange={e => setProductSearch(e.target.value)}
                                    style={{border: 'none', background: 'none', outline: 'none', width: '100%'}}
                                />
                            </div>
                            {products.length > 0 && (
                                <div style={{position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', marginTop: '0.25rem', zIndex: 10, boxShadow: 'var(--shadow-lg)'}}>
                                    {products.map(p => (
                                        <div key={p.id} onClick={() => handleAddItem(p)} style={{padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <div style={{fontWeight: 600}}>{p.name}</div>
                                                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>SKU: {p.sku} | Stock: {p.stock}</div>
                                            </div>
                                            <div style={{color: 'var(--primary)', fontWeight: 600}}>৳ {p.purchase_price}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Items Table */}
                        <table style={{width: '100%', borderCollapse: 'collapse'}}>
                            <thead>
                                <tr style={{background: 'var(--background)'}}>
                                    <th style={{padding: '0.75rem', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid var(--border)'}}>Product</th>
                                    <th style={{padding: '0.75rem', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '100px'}}>Unit Cost</th>
                                    <th style={{padding: '0.75rem', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '100px'}}>Quantity</th>
                                    <th style={{padding: '0.75rem', textAlign: 'right', fontWeight: 600, borderBottom: '1px solid var(--border)'}}>Total</th>
                                    <th style={{padding: '0.75rem', textAlign: 'center', fontWeight: 600, borderBottom: '1px solid var(--border)', width: '50px'}}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No products added yet.</td>
                                    </tr>
                                ) : items.map(item => (
                                    <tr key={item.id} style={{borderBottom: '1px solid var(--border)'}}>
                                        <td style={{padding: '0.75rem'}}>{item.name}</td>
                                        <td style={{padding: '0.75rem', textAlign: 'center'}}>
                                            <input type="number" min="0" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value))} style={{width: '80px', padding: '0.25rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px'}} />
                                        </td>
                                        <td style={{padding: '0.75rem', textAlign: 'center'}}>
                                            <input type="number" min="1" value={item.qty} onChange={e => handleItemChange(item.id, 'qty', Number(e.target.value))} style={{width: '80px', padding: '0.25rem', textAlign: 'center', border: '1px solid var(--border)', borderRadius: '4px'}} />
                                        </td>
                                        <td style={{padding: '0.75rem', textAlign: 'right', fontWeight: 600}}>৳ {(item.qty * item.price).toFixed(2)}</td>
                                        <td style={{padding: '0.75rem', textAlign: 'center'}}>
                                            <button onClick={() => handleRemoveItem(item.id)} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer'}}><Trash size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                        <h2 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Notes</h2>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', resize: 'vertical'}} placeholder="Optional purchase notes..."></textarea>
                    </div>

                </div>

                {/* Right Column: Payment & Summary */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    
                    <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', position: 'sticky', top: '2rem'}}>
                        <h2 style={{margin: '0 0 1rem 0', fontSize: '1.25rem'}}>Payment Summary</h2>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--text-muted)'}}>
                            <span>Subtotal</span>
                            <span>৳ {subtotal.toFixed(2)}</span>
                        </div>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', alignItems: 'center'}}>
                            <span>Discount</span>
                            <div style={{display: 'flex', alignItems: 'center'}}>
                                <span>- ৳</span>
                                <input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} style={{width: '80px', padding: '0.25rem', textAlign: 'right', border: '1px solid var(--border)', borderRadius: '4px', marginLeft: '0.5rem'}} />
                            </div>
                        </div>

                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border)'}}>
                            <span>Tax</span>
                            <div style={{display: 'flex', alignItems: 'center'}}>
                                <span>+ ৳</span>
                                <input type="number" min="0" value={tax} onChange={e => setTax(Number(e.target.value))} style={{width: '80px', padding: '0.25rem', textAlign: 'right', border: '1px solid var(--border)', borderRadius: '4px', marginLeft: '0.5rem'}} />
                            </div>
                        </div>

                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 800}}>
                            <span>Total</span>
                            <span>৳ {total.toFixed(2)}</span>
                        </div>

                        <div style={{background: 'var(--background)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem'}}>
                            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Paid Amount</label>
                            <input type="number" min="0" max={total} value={paidAmount} onChange={e => setPaidAmount(e.target.value ? Number(e.target.value) : '')} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--primary)', background: 'var(--surface)', fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem'}} placeholder="0.00" />
                            
                            <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem'}}>
                                <button onClick={() => setPaidAmount(0)} style={{flex: 1, padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', background: 'var(--surface)'}}>Zero</button>
                                <button onClick={() => setPaidAmount(total)} style={{flex: 1, padding: '0.5rem', border: '1px solid var(--primary)', borderRadius: '4px', cursor: 'pointer', background: '#eff6ff', color: 'var(--primary)', fontWeight: 600}}>Full</button>
                            </div>

                            <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', marginBottom: '1rem'}}>
                                <option value="cash">Cash</option>
                                <option value="bank">Bank</option>
                                <option value="bkash">bKash</option>
                                <option value="nagad">Nagad</option>
                            </select>

                            {paymentMethod !== 'cash' && (
                                <>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Reference</label>
                                    <input type="text" value={paymentRef} onChange={e => setPaymentRef(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)'}} />
                                </>
                            )}
                        </div>

                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 700, color: dueAmount > 0 ? 'var(--danger)' : 'var(--success)'}}>
                            <span>Due</span>
                            <span>৳ {dueAmount.toFixed(2)}</span>
                        </div>

                        <button 
                            onClick={handleSavePurchase}
                            disabled={processing || items.length === 0 || !supplierId}
                            style={{
                                width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', 
                                fontWeight: 700, fontSize: '1.1rem', cursor: (processing || items.length === 0 || !supplierId) ? 'not-allowed' : 'pointer', 
                                opacity: (processing || items.length === 0 || !supplierId) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
                            }}
                        >
                            {processing ? 'Saving...' : <><Check size={20} /> Complete Purchase</>}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
