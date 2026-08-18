'use client'

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer } from 'lucide-react';

function PurchaseDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const purchaseId = searchParams.get('id') as string;

    const purchase = useLiveQuery(() => localDB.purchases.get(purchaseId), [purchaseId]);
    const items = useLiveQuery(() => localDB.purchaseItems.where('purchase_id').equals(purchaseId).toArray(), [purchaseId]) || [];
    const payments = useLiveQuery(() => localDB.supplierPayments.where('purchase_id').equals(purchaseId).toArray(), [purchaseId]) || [];
    
    // Fetch supplier and staff for display
    const supplier = useLiveQuery(() => purchase?.supplier_id ? localDB.suppliers.get(purchase.supplier_id) : undefined, [purchase?.supplier_id]);
    const staff = useLiveQuery(() => purchase?.staff_id ? localDB.staff.get(purchase.staff_id) : undefined, [purchase?.staff_id]);

    if (purchase === undefined) return <div style={{padding: '2rem'}}>Loading...</div>;
    if (purchase === null) return <div style={{padding: '2rem'}}>Purchase not found</div>;

    return (
        <div style={{padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <button onClick={() => router.back()} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600}}>
                <ArrowLeft size={16} /> Back to Purchases
            </button>

            <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                
                {/* Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem'}}>
                    <div>
                        <h1 style={{fontSize: '1.5rem', margin: '0 0 0.5rem 0'}}>Purchase Ref: {purchase.reference_no || purchase.id.slice(0, 8)}</h1>
                        <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>Date: {new Date(purchase.purchase_date).toLocaleString()}</p>
                    </div>
                    <div style={{textAlign: 'right'}}>
                        <p style={{margin: '0 0 0.25rem 0', fontWeight: 600}}>Staff: {staff?.name || 'Unknown'}</p>
                        <p style={{margin: 0, color: 'var(--text-muted)'}}>Supplier: {supplier?.name || 'Unknown'}</p>
                    </div>
                </div>

                {/* Items */}
                <div style={{marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Items</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--border)', color: 'var(--text-muted)'}}>
                                <th style={{padding: '0.5rem 0'}}>Item</th>
                                <th style={{padding: '0.5rem 0'}}>Qty</th>
                                <th style={{padding: '0.5rem 0'}}>Unit Cost</th>
                                <th style={{padding: '0.5rem 0', textAlign: 'right'}}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id} style={{borderBottom: '1px solid var(--border)'}}>
                                    <td style={{padding: '0.75rem 0'}}>{item.product_name}</td>
                                    <td style={{padding: '0.75rem 0'}}>{item.quantity}</td>
                                    <td style={{padding: '0.75rem 0'}}>৳ {item.unit_price}</td>
                                    <td style={{padding: '0.75rem 0', textAlign: 'right', fontWeight: 600}}>৳ {item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals & Payments */}
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    {/* Payments */}
                    <div style={{flex: 1, paddingRight: '2rem'}}>
                        <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Payments Made</h3>
                        {payments.length === 0 ? (
                            <p style={{margin: 0, color: 'var(--text-muted)'}}>No payment records.</p>
                        ) : payments.map(p => (
                            <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                                <span style={{textTransform: 'capitalize'}}>{p.payment_method} {p.reference_no ? `(${p.reference_no})` : ''}</span>
                                <span style={{fontWeight: 600}}>৳ {p.amount.toFixed(2)}</span>
                            </div>
                        ))}
                        {purchase.due_amount > 0 && (
                            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)'}}>
                                <span style={{color: 'var(--danger)', fontWeight: 600}}>Due Amount</span>
                                <span style={{color: 'var(--danger)', fontWeight: 600}}>৳ {purchase.due_amount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    <div style={{flex: 1, paddingLeft: '2rem', borderLeft: '1px solid var(--border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--text-muted)'}}>Subtotal</span>
                            <span>৳ {purchase.subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--text-muted)'}}>Discount</span>
                            <span style={{color: 'var(--danger)'}}>- ৳ {purchase.discount_amount.toFixed(2)}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--text-muted)'}}>Tax</span>
                            <span>+ ৳ {purchase.tax_amount?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)', fontSize: '1.25rem', fontWeight: 800}}>
                            <span>Total</span>
                            <span>৳ {purchase.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)'}}>
                    <button onClick={() => window.print()} style={{flex: 1, padding: '1rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}>
                        <Printer size={18} /> Print Record
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PurchaseDetailPage() {
    return (
        <Suspense fallback={<div style={{padding: '2rem'}}>Loading...</div>}>
            <PurchaseDetailContent />
        </Suspense>
    );
}
