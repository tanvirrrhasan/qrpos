'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Phone, MapPin, Edit, Wallet, Calendar, X, Check, Mail, FileText, ShoppingBag, CreditCard, Banknote, Smartphone, Building2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Customer } from '@/lib/types';

function CustomerProfileContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const customerId = searchParams.get('id') as string;

    const [storeId, setStoreId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    
    // Due Payment Modal State
    const [showDueModal, setShowDueModal] = useState(false);
    const [dueAmount, setDueAmount] = useState<number | ''>('');
    const [duePaymentMethod, setDuePaymentMethod] = useState('cash');
    const [dueRef, setDueRef] = useState('');
    const [dueNotes, setDueNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    // Edit Customer Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });
    const [savingEdit, setSavingEdit] = useState(false);

    useEffect(() => {
        async function fetchAuth() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);
        }
        fetchAuth();
    }, []);

    const customer = useLiveQuery(() => localDB.customers.get(customerId), [customerId]);
    const sales = useLiveQuery(() => localDB.sales.where('customer_id').equals(customerId).toArray(), [customerId]) || [];
    const duePayments = useLiveQuery(() => localDB.duePayments.where('customer_id').equals(customerId).toArray(), [customerId]) || [];
    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];
    const staffMembers = useLiveQuery(() => localDB.staff.toArray(), []) || [];

    const getStaffName = (staffId?: string) => {
        if (!staffId) return 'Owner';
        const found = staffMembers.find(st => st.id === staffId || st.auth_user_id === staffId);
        return found ? `${found.name} (${found.role})` : 'Owner / Admin';
    };

    const paymentSettings = useMemo(() => {
        const pSetting = settings.find(s => s.setting_key === 'payments');
        if (!pSetting || !pSetting.setting_value) {
            return { cash: true, bkash: true, nagad: true, rocket: false, bank: false, card: false };
        }
        return pSetting.setting_value;
    }, [settings]);

    const availablePaymentMethods = useMemo(() => {
        const methods = [];
        if (paymentSettings.cash !== false) methods.push({ id: 'cash', label: 'Cash', icon: <Banknote size={16} />, color: '#10b981' });
        if (paymentSettings.bkash) methods.push({ id: 'bkash', label: 'bKash', icon: <Smartphone size={16} />, color: '#e2136e' });
        if (paymentSettings.nagad) methods.push({ id: 'nagad', label: 'Nagad', icon: <Smartphone size={16} />, color: '#f7941d' });
        if (paymentSettings.rocket) methods.push({ id: 'rocket', label: 'Rocket', icon: <Smartphone size={16} />, color: '#8c3494' });
        if (paymentSettings.bank) methods.push({ id: 'bank', label: 'Bank', icon: <Building2 size={16} />, color: '#2563eb' });
        if (paymentSettings.card) methods.push({ id: 'card', label: 'Card', icon: <CreditCard size={16} />, color: '#4f46e5' });
        return methods;
    }, [paymentSettings]);

    // Pre-fill edit modal form
    useEffect(() => {
        if (customer) {
            setEditFormData({
                name: customer.name || '',
                phone: customer.phone || '',
                email: customer.email || '',
                address: customer.address || '',
                notes: customer.notes || ''
            });
        }
    }, [customer]);

    // Combine and sort complete customer history
    const history = [
        ...sales.map(s => ({
            type: 'sale',
            id: s.id,
            date: new Date(s.sale_date || s.created_at),
            amount: s.total,
            paid: s.paid_amount,
            due_added: s.due_amount,
            invoice: s.invoice_no,
            status: s.payment_status,
            method: (s as any).payment_method || 'cash',
            staff_id: s.staff_id,
            ref: null
        })),
        ...duePayments.map(dp => ({
            type: 'payment',
            id: dp.id,
            date: new Date(dp.payment_date || dp.created_at),
            amount: dp.amount,
            paid: dp.amount,
            due_added: -dp.amount,
            invoice: 'Due Payment',
            status: 'paid',
            method: dp.payment_method,
            staff_id: dp.received_by,
            ref: dp.reference_no,
            notes: dp.notes
        }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    if (customer === undefined) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customer profile...</div>;
    if (customer === null) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Customer not found</div>;

    const openDueModal = () => {
        setDueAmount(''); // Blank by default as requested!
        setDuePaymentMethod(availablePaymentMethods[0]?.id || 'cash');
        setDueRef('');
        setDueNotes('');
        setShowDueModal(true);
    };

    const handleAmountInputChange = (val: string, maxLimit: number) => {
        if (val === '') {
            setDueAmount('');
            return;
        }
        let num = parseFloat(val);
        if (isNaN(num) || num < 0) num = 0;
        if (num > maxLimit) {
            num = maxLimit;
        }
        setDueAmount(num);
    };

    const handleReceiveDue = async () => {
        const amount = Number(dueAmount);
        if (!amount || amount <= 0) return alert('Please enter a valid payment amount');
        if (amount > customer.total_due) return alert('Payment amount exceeds current total due');
        if (!storeId) return;

        setProcessing(true);
        try {
            const paymentId = uuidv4();
            const paymentDate = new Date().toISOString();

            const paymentData = {
                id: paymentId,
                store_id: storeId,
                customer_id: customer.id,
                amount: amount,
                payment_method: duePaymentMethod,
                reference_no: dueRef || undefined,
                notes: dueNotes || undefined,
                received_by: userId || undefined,
                payment_date: paymentDate,
                created_at: paymentDate,
                is_synced: false
            };

            const updatedDue = Math.max(0, customer.total_due - amount);

            // Save to localDB
            await localDB.duePayments.put(paymentData);
            await localDB.customers.update(customer.id, { total_due: updatedDue, updated_at: paymentDate });

            const logId = uuidv4();
            await localDB.activityLog.put({
                id: logId,
                store_id: storeId,
                staff_id: userId || undefined,
                action: 'due_payment_received',
                entity_type: 'customer',
                entity_id: customer.id,
                details: { amount, method: duePaymentMethod },
                created_at: paymentDate
            });

            // Sync to Supabase
            try {
                await supabase.from('due_payments').insert([paymentData]);
                await supabase.from('customers').update({ total_due: updatedDue, updated_at: paymentDate }).eq('id', customer.id);
                await localDB.duePayments.update(paymentId, { is_synced: true });
            } catch (err) {
                console.log('Will sync payment later', err);
            }

            setShowDueModal(false);
            setDueAmount('');
            setDueRef('');
            setDueNotes('');
        } catch (err: any) {
            alert('Error processing payment: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editFormData.name.trim()) return alert('Name is required');
        setSavingEdit(true);
        try {
            const now = new Date().toISOString();
            const payload = {
                name: editFormData.name.trim(),
                phone: editFormData.phone.trim() || undefined,
                email: editFormData.email.trim() || undefined,
                address: editFormData.address.trim() || undefined,
                notes: editFormData.notes.trim() || undefined,
                updated_at: now
            };

            await localDB.customers.update(customer.id, payload);
            try {
                await supabase.from('customers').update(payload).eq('id', customer.id);
            } catch (e) {}

            setShowEditModal(false);
        } catch (err: any) {
            alert('Failed to update profile: ' + err.message);
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div style={{ padding: '2rem 1.5rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
            
            <button 
                onClick={() => router.back()} 
                style={{
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-muted)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    marginBottom: '1.5rem', 
                    fontWeight: 600,
                    fontSize: '0.95rem'
                }}
            >
                <ArrowLeft size={18} /> Back to Customers
            </button>

            {/* Profile Header */}
            <div style={{
                background: 'var(--surface)', 
                padding: '1.75rem 2rem', 
                borderRadius: 'var(--radius-lg)', 
                border: '1px solid var(--border)', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'flex-start', 
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '2rem'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, margin: 0, color: 'var(--text-main)' }}>{customer.name}</h1>
                        {customer.notes && (
                            <span style={{ padding: '0.2rem 0.6rem', borderRadius: '1rem', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <FileText size={13} /> {customer.notes}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                        {customer.phone && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Phone size={16} color="var(--primary)" /> <span>{customer.phone}</span>
                            </div>
                        )}
                        {customer.email && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Mail size={16} color="var(--primary)" /> <span>{customer.email}</span>
                            </div>
                        )}
                        {customer.address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <MapPin size={16} color="var(--primary)" /> <span>{customer.address}</span>
                            </div>
                        )}
                        {customer.last_purchase_at && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Calendar size={16} /> <span>Last Active: {new Date(customer.last_purchase_at).toLocaleDateString()}</span>
                            </div>
                        )}
                    </div>
                </div>

                <div>
                    <button 
                        onClick={() => setShowEditModal(true)}
                        style={{
                            background: 'var(--background)', 
                            border: '1px solid var(--border)', 
                            padding: '0.65rem 1.25rem', 
                            borderRadius: 'var(--radius)', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            fontWeight: 600,
                            color: 'var(--text-main)'
                        }}
                    >
                        <Edit size={16} /> Edit Profile
                    </button>
                </div>
            </div>

            {/* Lifetime Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                
                {/* Total Due Card */}
                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderTop: '4px solid #ef4444' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Current Total Due (বাকি)</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: customer.total_due > 0 ? '#ef4444' : 'var(--text-main)' }}>
                        ৳ {customer.total_due.toFixed(2)}
                    </div>
                    {customer.total_due > 0 && (
                        <button 
                            onClick={openDueModal} 
                            style={{
                                marginTop: '1.25rem', 
                                width: '100%', 
                                padding: '0.85rem', 
                                background: '#10b981', 
                                color: 'white', 
                                border: 'none', 
                                borderRadius: 'var(--radius)', 
                                fontWeight: 700, 
                                cursor: 'pointer', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                fontSize: '1rem'
                            }}
                        >
                            <Wallet size={18} /> Receive Due (বাকি গ্রহণ)
                        </button>
                    )}
                </div>

                {/* Total Spent Card */}
                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderTop: '4px solid #10b981' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Lifetime Purchases (মোট কেনাকাটা)</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        ৳ {(customer.total_purchases || 0).toFixed(2)}
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Total Volume across all completed orders
                    </div>
                </div>

                {/* Orders Count Card */}
                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', borderTop: '4px solid #3b82f6' }}>
                    <div style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Orders (মোট অর্ডার)</div>
                    <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        {customer.purchase_count || 0}
                    </div>
                    <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Completed sales transactions
                    </div>
                </div>
            </div>

            {/* Complete Transaction & Ledger History */}
            <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Complete Lifetime History & Ledger</h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{history.length} Transactions Recorded</span>
                </div>
                
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'var(--background)' }}>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Date & Time</th>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Type / Reference</th>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Total Bill</th>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Amount Paid</th>
                                <th style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Due Impact</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No sales or due payment history found for this customer.
                                    </td>
                                </tr>
                            )}
                            {history.map((h, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <div style={{ fontWeight: 600 }}>{h.date.toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.date.toLocaleTimeString()}</div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.6rem', 
                                            borderRadius: '1rem', 
                                            fontSize: '0.8rem', 
                                            fontWeight: 700,
                                            background: h.type === 'sale' ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                            color: h.type === 'sale' ? '#3b82f6' : '#10b981',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            marginBottom: '0.25rem'
                                        }}>
                                            {h.type === 'sale' ? <ShoppingBag size={12} /> : <CreditCard size={12} />}
                                            {h.type === 'sale' ? 'Sale Invoice' : 'Due Collection'}
                                        </span>
                                        {h.type === 'sale' && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                {h.invoice}
                                            </div>
                                        )}
                                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                            <span style={{ textTransform: 'capitalize' }}>💳 Method: <b>{h.method || 'cash'}</b>{h.ref ? ` (${h.ref})` : ''}</span>
                                            <span>👤 Processed by: <b style={{ color: 'var(--primary)' }}>{getStaffName(h.staff_id)}</b></span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700 }}>
                                        ৳ {h.amount.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#10b981' }}>
                                        ৳ {h.paid.toFixed(2)}
                                    </td>
                                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: h.due_added > 0 ? '#ef4444' : (h.due_added < 0 ? '#10b981' : 'var(--text-muted)') }}>
                                        {h.due_added > 0 ? `+ ৳${h.due_added.toFixed(2)}` : (h.due_added < 0 ? `- ৳${Math.abs(h.due_added).toFixed(2)}` : 'No Due')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Glass Receive Due Modal */}
            {showDueModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--surface)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '440px', border: '1px solid var(--border)', boxShadow: '0 20px 30px -10px rgba(0,0,0,0.6)' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>বাকি পরিশোধ (Receive Due Payment)</h2>
                            <button onClick={() => setShowDueModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>বর্তমান বাকি:</span>
                            <span style={{ color: '#ef4444', fontSize: '1.35rem', fontWeight: 800 }}>৳ {customer.total_due.toFixed(2)}</span>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Payment Amount (৳) *</label>
                            <input 
                                type="number" 
                                min="0"
                                max={customer.total_due}
                                value={dueAmount} 
                                onChange={e => handleAmountInputChange(e.target.value, customer.total_due)} 
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--text-main)' }}
                                placeholder="0.00"
                            />
                            
                            {/* High contrast clear shortcut buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button"
                                    onClick={() => handleAmountInputChange(Math.min(100, customer.total_due).toString(), customer.total_due)} 
                                    style={{ flex: 1, padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                    ৳ 100
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleAmountInputChange(Math.min(500, customer.total_due).toString(), customer.total_due)} 
                                    style={{ flex: 1, padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                    ৳ 500
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleAmountInputChange(customer.total_due.toString(), customer.total_due)} 
                                    style={{ flex: 1.4, padding: '0.5rem', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                                >
                                    Full Amount
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Payment Method Grid Buttons with Lucide Icons */}
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Payment Method</label>
                            <div style={{ display: 'grid', gridTemplateColumns: availablePaymentMethods.length <= 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '0.5rem' }}>
                                {availablePaymentMethods.map(pm => {
                                    const isSelected = duePaymentMethod === pm.id;
                                    return (
                                        <button
                                            key={pm.id}
                                            type="button"
                                            onClick={() => setDuePaymentMethod(pm.id)}
                                            style={{
                                                padding: '0.6rem 0.5rem',
                                                borderRadius: 'var(--radius)',
                                                border: isSelected ? `2px solid ${pm.color}` : '1px solid var(--border)',
                                                background: isSelected ? `${pm.color}18` : 'var(--surface)',
                                                color: isSelected ? pm.color : 'var(--text-main)',
                                                fontWeight: isSelected ? 700 : 500,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.4rem',
                                                fontSize: '0.85rem',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center' }}>{pm.icon}</span>
                                            <span>{pm.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {duePaymentMethod !== 'cash' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Reference / TrxID</label>
                                <input type="text" value={dueRef} onChange={e => setDueRef(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                        )}

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Notes (Optional)</label>
                            <input type="text" value={dueNotes} onChange={e => setDueNotes(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                        </div>

                        {Number(dueAmount) > 0 && (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>New Due Balance:</span>
                                <span style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: 800 }}>৳ {Math.max(0, customer.total_due - Number(dueAmount)).toFixed(2)}</span>
                            </div>
                        )}

                        <button 
                            onClick={handleReceiveDue}
                            disabled={processing || !dueAmount || Number(dueAmount) <= 0}
                            style={{ width: '100%', padding: '0.85rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '1rem', cursor: (processing || !dueAmount || Number(dueAmount) <= 0) ? 'not-allowed' : 'pointer', opacity: (processing || !dueAmount || Number(dueAmount) <= 0) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {processing ? 'Processing...' : <><Check size={18} /> Confirm Due Payment</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Glass Edit Profile Modal */}
            {showEditModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--surface)', padding: '1.75rem', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '450px', border: '1px solid var(--border)', boxShadow: '0 20px 30px -10px rgba(0,0,0,0.6)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Edit Customer Profile</h2>
                            <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={22} /></button>
                        </div>
                        <form onSubmit={handleUpdateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Name *</label>
                                <input required type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone</label>
                                <input type="text" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Email</label>
                                <input type="email" value={editFormData.email} onChange={e => setEditFormData({...editFormData, email: e.target.value})} style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Address</label>
                                <input type="text" value={editFormData.address} onChange={e => setEditFormData({...editFormData, address: e.target.value})} style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Notes / Tag</label>
                                <input type="text" value={editFormData.notes} onChange={e => setEditFormData({...editFormData, notes: e.target.value})} style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} />
                            </div>
                            <button type="submit" disabled={savingEdit} style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: savingEdit ? 'not-allowed' : 'pointer' }}>
                                {savingEdit ? 'Updating...' : 'Save Profile Changes'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}

export default function CustomerProfilePage() {
    return (
        <Suspense fallback={<div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading customer profile...</div>}>
            <CustomerProfileContent />
        </Suspense>
    );
}
