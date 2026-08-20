'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Phone, MapPin, Edit, Wallet, Building2, X, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function SupplierProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const supplierId = searchParams.get('id') as string;

    const [storeId, setStoreId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState<number | ''>('');
    const [payMethod, setPayMethod] = useState('cash');
    const [payRef, setPayRef] = useState('');
    const [payNotes, setPayNotes] = useState('');
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

    const supplier = useLiveQuery(() => localDB.suppliers.get(supplierId), [supplierId]);
    const purchases = useLiveQuery(() => localDB.purchases.where('supplier_id').equals(supplierId).toArray(), [supplierId]) || [];
    const supplierPayments = useLiveQuery(() => localDB.supplierPayments.where('supplier_id').equals(supplierId).toArray(), [supplierId]) || [];

    // Combine and sort history
    const history = [
        ...purchases.map(p => ({
            type: 'purchase',
            id: p.id,
            date: new Date(p.purchase_date),
            amount: p.total,
            paid: p.paid_amount,
            due_added: p.due_amount,
            reference: p.reference_no || 'Purchase'
        })),
        ...supplierPayments.map(sp => ({
            type: 'payment',
            id: sp.id,
            date: new Date(sp.payment_date),
            amount: sp.amount,
            paid: sp.amount,
            due_added: -sp.amount,
            reference: sp.reference_no || 'Payment'
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (supplier === undefined) return <div style={{padding: '2rem'}}>Loading...</div>;
    if (supplier === null) return <div style={{padding: '2rem'}}>Supplier not found</div>;

    const handlePaySupplier = async () => {
        const amount = Number(payAmount);
        if (!amount || amount <= 0) return alert('Enter a valid amount');
        if (amount > supplier.total_due) return alert('Amount exceeds total due');
        if (!storeId) return;

        setProcessing(true);
        try {
            const paymentId = uuidv4();
            const paymentDate = new Date().toISOString();

            const paymentData = {
                id: paymentId,
                store_id: storeId,
                supplier_id: supplier.id,
                amount: amount,
                payment_method: payMethod,
                reference_no: payRef,
                notes: payNotes,
                paid_by: userId || undefined,
                payment_date: paymentDate,
                created_at: paymentDate
            };

            const updatedDue = supplier.total_due - amount;

            // Save to localDB
            await localDB.supplierPayments.put(paymentData);
            await localDB.suppliers.update(supplier.id, { total_due: updatedDue });

            const logId = uuidv4();
            await localDB.activityLog.put({
                id: logId,
                store_id: storeId,
                staff_id: userId || undefined,
                action: 'supplier_payment_made',
                entity_type: 'supplier',
                entity_id: supplier.id,
                details: { amount, method: payMethod },
                created_at: paymentDate
            });

            // Sync to supabase
            try {
                await supabase.from('supplier_payments').insert([paymentData]);
                await supabase.from('suppliers').update({ total_due: updatedDue }).eq('id', supplier.id);
            } catch (err) {
                console.log('Will sync later', err);
            }

            setShowPayModal(false);
            setPayAmount('');
            setPayRef('');
            setPayNotes('');
        } catch (err: any) {
            alert('Error processing payment: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            
            <button onClick={() => router.back()} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600}}>
                <ArrowLeft size={16} /> Back to Suppliers
            </button>

            {/* Profile Header */}
            <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem'}}>
                <div>
                    <h1 style={{fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-main)'}}>{supplier.name}</h1>
                    <div style={{display: 'flex', gap: '1.5rem', color: 'var(--text-muted)'}}>
                        {supplier.company_name && <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><Building2 size={16} /> {supplier.company_name}</div>}
                        {supplier.phone && <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><Phone size={16} /> {supplier.phone}</div>}
                        {supplier.address && <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}><MapPin size={16} /> {supplier.address}</div>}
                    </div>
                </div>
                <div>
                    <button style={{background: 'var(--background)', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600}}>
                        <Edit size={16} /> Edit Profile
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '2rem'}}>
                
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderTop: '4px solid #ef4444'}}>
                    <div style={{color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem'}}>Total Due (Owed to Supplier)</div>
                    <div style={{fontSize: '2rem', fontWeight: 800, color: supplier.total_due > 0 ? '#ef4444' : 'var(--text-main)'}}>৳ {supplier.total_due.toFixed(2)}</div>
                    {supplier.total_due > 0 && (
                        <button onClick={() => setShowPayModal(true)} style={{marginTop: '1rem', width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'}}>
                            <Wallet size={16} /> Pay Supplier (সাপ্লায়ারকে পেমেন্ট করুন)
                        </button>
                    )}
                </div>

                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', borderTop: '4px solid #10b981'}}>
                    <div style={{color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem'}}>Total Purchases</div>
                    <div style={{fontSize: '2rem', fontWeight: 800, color: 'var(--text-main)'}}>৳ {supplier.total_purchases?.toFixed(2) || '0.00'}</div>
                </div>
            </div>

            {/* Transaction History */}
            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border)'}}>
                    <h2 style={{margin: 0, fontSize: '1.25rem', fontWeight: 700}}>Transaction History</h2>
                </div>
                
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)'}}>
                            <th style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)'}}>Date</th>
                            <th style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)'}}>Type / Ref</th>
                            <th style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)'}}>Total Amount</th>
                            <th style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)'}}>Paid Amount</th>
                            <th style={{padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)'}}>Due Changed</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'}}>No transactions found for this supplier.</td>
                            </tr>
                        )}
                        {history.map((h, i) => (
                            <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                <td style={{padding: '1rem 1.5rem'}}>
                                    <div style={{fontWeight: 600}}>{h.date.toLocaleDateString()}</div>
                                    <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{h.date.toLocaleTimeString()}</div>
                                </td>
                                <td style={{padding: '1rem 1.5rem'}}>
                                    <span style={{
                                        padding: '0.25rem 0.5rem', 
                                        borderRadius: '1rem', 
                                        fontSize: '0.8rem', 
                                        fontWeight: 600,
                                        background: h.type === 'purchase' ? '#e0f2fe' : '#dcfce7',
                                        color: h.type === 'purchase' ? '#0369a1' : '#166534',
                                        display: 'inline-block',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {h.type === 'purchase' ? 'Purchase' : 'Supplier Payment'}
                                    </span>
                                    {h.type === 'purchase' && <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500}}>{h.reference}</div>}
                                </td>
                                <td style={{padding: '1rem 1.5rem', fontWeight: 600}}>৳ {h.amount.toFixed(2)}</td>
                                <td style={{padding: '1rem 1.5rem', fontWeight: 600, color: '#10b981'}}>৳ {h.paid.toFixed(2)}</td>
                                <td style={{padding: '1rem 1.5rem', fontWeight: 700, color: h.due_added > 0 ? '#ef4444' : (h.due_added < 0 ? '#10b981' : 'inherit')}}>
                                    {h.due_added > 0 ? `+ ৳${h.due_added.toFixed(2)}` : (h.due_added < 0 ? `- ৳${Math.abs(h.due_added).toFixed(2)}` : '-')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pay Supplier Modal */}
            {showPayModal && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', width: '450px', border: '1px solid var(--border)', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'}}>
                        
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                            <h2 style={{margin: 0, fontSize: '1.25rem'}}>সাপ্লায়ারকে পেমেন্ট করুন</h2>
                            <button onClick={() => setShowPayModal(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><X size={20} /></button>
                        </div>

                        <div style={{background: '#fef2f2', border: '1px solid #fecaca', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span style={{color: '#991b1b', fontWeight: 600}}>বর্তমান বাকি:</span>
                            <span style={{color: '#ef4444', fontSize: '1.5rem', fontWeight: 800}}>৳ {supplier.total_due.toFixed(2)}</span>
                        </div>

                        <div style={{marginBottom: '1rem'}}>
                            <label style={{display: 'block', fontWeight: 600, marginBottom: '0.5rem'}}>Payment Amount (৳) *</label>
                            <input 
                                type="number" 
                                value={payAmount} 
                                onChange={e => setPayAmount(Number(e.target.value))} 
                                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '1.25rem', fontWeight: 'bold'}}
                                placeholder="0.00"
                            />
                            
                            <div style={{display: 'flex', gap: '0.5rem', marginTop: '0.5rem'}}>
                                <button onClick={() => setPayAmount(100)} style={{flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>৳100</button>
                                <button onClick={() => setPayAmount(1000)} style={{flex: 1, padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer', fontWeight: 600}}>৳1000</button>
                                <button onClick={() => setPayAmount(supplier.total_due)} style={{flex: 1.5, padding: '0.5rem', background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '4px', cursor: 'pointer', fontWeight: 700}}>Full Amount</button>
                            </div>
                        </div>

                        <div style={{marginBottom: '1rem'}}>
                            <label style={{display: 'block', fontWeight: 600, marginBottom: '0.5rem'}}>Payment Method</label>
                            <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)'}}>
                                <option value="cash">Cash (নগদ)</option>
                                <option value="bank">Bank Transfer</option>
                                <option value="bkash">bKash</option>
                                <option value="nagad">Nagad</option>
                            </select>
                        </div>

                        {payMethod !== 'cash' && (
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display: 'block', fontWeight: 600, marginBottom: '0.5rem'}}>Reference / Check No</label>
                                <input type="text" value={payRef} onChange={e => setPayRef(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)'}} />
                            </div>
                        )}

                        <div style={{marginBottom: '1.5rem'}}>
                            <label style={{display: 'block', fontWeight: 600, marginBottom: '0.5rem'}}>Notes (Optional)</label>
                            <input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)'}} />
                        </div>

                        {Number(payAmount) > 0 && (
                            <div style={{background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span style={{color: '#166534', fontWeight: 600}}>After Payment (New Due):</span>
                                <span style={{color: '#10b981', fontSize: '1.25rem', fontWeight: 800}}>৳ {Math.max(0, supplier.total_due - Number(payAmount)).toFixed(2)}</span>
                            </div>
                        )}

                        <button 
                            onClick={handlePaySupplier}
                            disabled={processing || !payAmount || Number(payAmount) <= 0}
                            style={{width: '100%', padding: '1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '1.1rem', cursor: (processing || !payAmount || Number(payAmount) <= 0) ? 'not-allowed' : 'pointer', opacity: (processing || !payAmount || Number(payAmount) <= 0) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'}}
                        >
                            {processing ? 'Processing...' : <><Check size={20} /> Submit Payment</>}
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function SupplierProfilePage() {
    return (
        <Suspense fallback={<div style={{padding: '2rem'}}>Loading supplier profile...</div>}>
            <SupplierProfileContent />
        </Suspense>
    );
}
