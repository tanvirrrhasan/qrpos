'use client'

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { Search, Plus, Edit, Trash2, X, Eye, Phone, Mail, MapPin, FileText, ShoppingBag, AlertCircle, Wallet, Check, Banknote, Smartphone, Building2, CreditCard } from 'lucide-react';
import styles from '../products/products.module.css'; // Reusing table styles
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';
import type { Customer } from '@/lib/types';

export default function CustomersPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'all' | 'due' | 'no-due' | 'top'>('all');
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    
    // Quick Receive Due Modal State
    const [dueModalCustomer, setDueModalCustomer] = useState<Customer | null>(null);
    const [quickDueAmount, setQuickDueAmount] = useState<number | ''>('');
    const [quickDueMethod, setQuickDueMethod] = useState('cash');
    const [quickDueRef, setQuickDueRef] = useState('');
    const [quickDueNotes, setQuickDueNotes] = useState('');
    const [processingDue, setProcessingDue] = useState(false);

    // Add / Edit Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        async function fetchStore() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
        }
        fetchStore();
    }, []);

    const customers = useLiveQuery(
        () => {
            let collection = localDB.customers.toCollection();
            
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                collection = collection.filter(c => 
                    c.name.toLowerCase().includes(term) || 
                    (c.phone || '').includes(term) ||
                    (c.email || '').toLowerCase().includes(term)
                );
            }
            
            return collection.toArray().then(arr => {
                let filtered = arr;
                if (filterCategory === 'due') filtered = arr.filter(c => c.total_due > 0);
                else if (filterCategory === 'no-due') filtered = arr.filter(c => c.total_due <= 0);
                else if (filterCategory === 'top') filtered = arr.sort((a, b) => (b.total_purchases || 0) - (a.total_purchases || 0));

                if (filterCategory !== 'top') {
                    filtered = filtered.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
                }
                return filtered;
            });
        },
        [searchTerm, filterCategory]
    );

    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];

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

    const openAddModal = () => {
        setEditingCustomer(null);
        setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
        setShowModal(true);
    };

    const openEditModal = (cust: Customer) => {
        setEditingCustomer(cust);
        setFormData({
            name: cust.name || '',
            phone: cust.phone || '',
            email: cust.email || '',
            address: cust.address || '',
            notes: cust.notes || ''
        });
        setShowModal(true);
    };

    const openReceiveDueModal = (cust: Customer) => {
        setDueModalCustomer(cust);
        setQuickDueAmount(''); // Blank by default as requested!
        setQuickDueMethod(availablePaymentMethods[0]?.id || 'cash');
        setQuickDueRef('');
        setQuickDueNotes('');
    };

    const handleAmountInputChange = (val: string, maxLimit: number) => {
        if (val === '') {
            setQuickDueAmount('');
            return;
        }
        let num = parseFloat(val);
        if (isNaN(num) || num < 0) num = 0;
        if (num > maxLimit) {
            num = maxLimit;
        }
        setQuickDueAmount(num);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId || !formData.name.trim()) return;
        setSaving(true);
        try {
            const now = new Date().toISOString();
            
            if (editingCustomer) {
                const updatedPayload: Partial<Customer> = {
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || undefined,
                    email: formData.email.trim() || undefined,
                    address: formData.address.trim() || undefined,
                    notes: formData.notes.trim() || undefined,
                    updated_at: now
                };

                await localDB.customers.update(editingCustomer.id, updatedPayload);
                try {
                    await supabase.from('customers').update(updatedPayload).eq('id', editingCustomer.id);
                } catch (err) {
                    console.log('Will sync update later', err);
                }

                // System Audit Activity Log
                const actPayload = {
                    id: uuidv4(),
                    store_id: storeId,
                    staff_id: undefined,
                    action: 'customer_updated',
                    entity_type: 'customer',
                    entity_id: editingCustomer.id,
                    details: { name: formData.name.trim(), phone: formData.phone.trim() },
                    created_at: now
                };
                await localDB.activityLog.put(actPayload);
                try {
                    await supabase.from('activity_logs').insert([actPayload]);
                } catch (e) {}
            } else {
                const id = uuidv4();
                const newPayload: Customer = {
                    id,
                    store_id: storeId,
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || undefined,
                    email: formData.email.trim() || undefined,
                    address: formData.address.trim() || undefined,
                    notes: formData.notes.trim() || undefined,
                    total_due: 0,
                    total_purchases: 0,
                    purchase_count: 0,
                    is_active: true,
                    created_at: now,
                    updated_at: now
                };

                await localDB.customers.put(newPayload);
                try {
                    await supabase.from('customers').insert([newPayload]);
                } catch (err) {
                    console.log('Will sync insert later', err);
                }

                // System Audit Activity Log
                const actPayload = {
                    id: uuidv4(),
                    store_id: storeId,
                    staff_id: undefined,
                    action: 'customer_created',
                    entity_type: 'customer',
                    entity_id: id,
                    details: { name: formData.name.trim(), phone: formData.phone.trim() },
                    created_at: now
                };
                await localDB.activityLog.put(actPayload);
                try {
                    await supabase.from('activity_logs').insert([actPayload]);
                } catch (e) {}
            }
            
            setShowModal(false);
            setFormData({ name: '', phone: '', email: '', address: '', notes: '' });
        } catch (err: any) {
            console.error(err);
            alert('Failed to save customer: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleQuickReceiveDue = async () => {
        if (!dueModalCustomer || !storeId) return;
        const amount = Number(quickDueAmount);
        if (!amount || amount <= 0) return alert('Please enter a valid amount');
        if (amount > dueModalCustomer.total_due) return alert('Payment amount exceeds current total due');

        setProcessingDue(true);
        try {
            const paymentId = uuidv4();
            const paymentDate = new Date().toISOString();

            const paymentData = {
                id: paymentId,
                store_id: storeId,
                customer_id: dueModalCustomer.id,
                amount: amount,
                payment_method: quickDueMethod,
                reference_no: quickDueRef || null,
                notes: quickDueNotes || null,
                payment_date: paymentDate,
                created_at: paymentDate,
                is_synced: false
            };

            const updatedDue = Math.max(0, dueModalCustomer.total_due - amount);

            await localDB.duePayments.put(paymentData as any);
            await localDB.customers.update(dueModalCustomer.id, { total_due: updatedDue, updated_at: paymentDate });

            // System Audit Activity Log
            const actPayload = {
                id: uuidv4(),
                store_id: storeId,
                staff_id: undefined,
                action: 'due_payment_received',
                entity_type: 'customer',
                entity_id: dueModalCustomer.id,
                details: { customer_name: dueModalCustomer.name, amount, method: quickDueMethod },
                created_at: paymentDate
            };
            await localDB.activityLog.put(actPayload);

            try {
                await supabase.from('due_payments').insert([paymentData]);
                await supabase.from('customers').update({ total_due: updatedDue, updated_at: paymentDate }).eq('id', dueModalCustomer.id);
                await supabase.from('activity_logs').insert([actPayload]);
            } catch (e) {}

            setDueModalCustomer(null);
        } catch (err: any) {
            alert('Error processing payment: ' + err.message);
        } finally {
            setProcessingDue(false);
        }
    };

    const handleDelete = async (cust: Customer) => {
        if (!confirm(`Are you sure you want to delete customer "${cust.name}"?`)) return;
        try {
            await localDB.customers.delete(cust.id);

            // System Audit Activity Log
            const actPayload = {
                id: uuidv4(),
                store_id: cust.store_id,
                staff_id: undefined,
                action: 'customer_deleted',
                entity_type: 'customer',
                entity_id: cust.id,
                details: { name: cust.name, phone: cust.phone, total_due: cust.total_due },
                created_at: new Date().toISOString()
            };
            await localDB.activityLog.put(actPayload);

            try {
                await supabase.from('customers').delete().eq('id', cust.id);
                await supabase.from('activity_logs').insert([actPayload]);
            } catch (err) {}
        } catch (err: any) {
            alert('Failed to delete: ' + err.message);
        }
    };

    return (
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <div>
                    <h1 style={{ margin: 0 }}>Customers Directory</h1>
                    <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Manage your customer database, lifetime purchase volume, and due records
                    </p>
                </div>
                <button className={styles.addButton} onClick={openAddModal}>
                    <Plus size={20} /> Add New Customer
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBar} style={{ flex: 1 }}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search by name, phone, or email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select 
                        value={filterCategory} 
                        onChange={e => setFilterCategory(e.target.value as any)}
                        style={{
                            padding: '0.65rem 1rem', 
                            borderRadius: 'var(--radius)', 
                            border: '1px solid var(--border)', 
                            background: 'var(--surface)', 
                            color: 'var(--text-main)',
                            fontWeight: 500,
                            cursor: 'pointer'
                        }}
                    >
                        <option value="all">All Customers</option>
                        <option value="due">Has Due (বাকি আছে)</option>
                        <option value="no-due">No Due (বাকি নেই)</option>
                        <option value="top">Top Spenders (সর্বোচ্চ কেনাকাটা)</option>
                    </select>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th style={{ width: '28%', padding: '0.6rem 0.75rem' }}>Customer Info</th>
                            <th style={{ width: '32%', padding: '0.6rem 0.75rem' }}>Contact & Address</th>
                            <th style={{ width: '12%', padding: '0.6rem 0.75rem' }}>Orders</th>
                            <th style={{ width: '11%', padding: '0.6rem 0.75rem' }}>Total Spent</th>
                            <th style={{ width: '10%', padding: '0.6rem 0.75rem' }}>Total Due</th>
                            <th style={{ width: '7%', padding: '0.6rem 0.75rem', textAlign: 'center' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers?.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No customers found</div>
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Add your first customer or try adjusting your search filter.</p>
                                </td>
                            </tr>
                        ) : customers?.map(customer => (
                            <tr key={customer.id}>
                                <td data-label="Customer Info" style={{ padding: '0.5rem 0.75rem' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{customer.name}</div>
                                    {customer.notes && (
                                        <div style={{ fontSize: '0.78rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                                            <FileText size={11} /> {customer.notes}
                                        </div>
                                    )}
                                </td>
                                <td data-label="Contact & Address" style={{ padding: '0.5rem 0.75rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.82rem' }}>
                                        {customer.phone ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                                                <Phone size={12} color="var(--primary)" /> <span>{customer.phone}</span>
                                            </div>
                                        ) : <span style={{ color: 'var(--text-muted)' }}>No Phone</span>}

                                        {customer.email && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                                <Mail size={12} /> <span>{customer.email}</span>
                                            </div>
                                        )}
                                        {customer.address && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)' }}>
                                                <MapPin size={12} /> <span>{customer.address}</span>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td data-label="Orders" style={{ padding: '0.5rem 0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, fontSize: '0.9rem' }}>
                                        <ShoppingBag size={13} color="var(--primary)" />
                                        <span>{customer.purchase_count || 0} orders</span>
                                    </div>
                                    {customer.last_purchase_at && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                            Last: {new Date(customer.last_purchase_at).toLocaleDateString()}
                                        </div>
                                    )}
                                </td>
                                <td data-label="Total Spent" style={{ padding: '0.5rem 0.75rem' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                                        ৳ {(customer.total_purchases || 0).toFixed(2)}
                                    </div>
                                </td>
                                <td data-label="Total Due" style={{ padding: '0.5rem 0.75rem' }}>
                                    <span style={{
                                        padding: '0.2rem 0.55rem',
                                        borderRadius: '1rem',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        background: customer.total_due > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                        color: customer.total_due > 0 ? '#ef4444' : '#10b981',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        {customer.total_due > 0 ? <AlertCircle size={12} /> : null}
                                        ৳ {customer.total_due.toFixed(2)}
                                    </span>
                                </td>
                                <td data-label="Actions" style={{ padding: '0.5rem 0.75rem' }}>
                                    <div className={styles.actions} style={{ justifyContent: 'center', gap: '0.35rem' }}>
                                        {/* Receive Due Button */}
                                        <button 
                                            className={styles.actionBtn}
                                            onClick={() => openReceiveDueModal(customer)}
                                            disabled={customer.total_due <= 0}
                                            title={customer.total_due > 0 ? "Receive Due (বাকি সংগ্রহ)" : "No Due Available"}
                                            style={{
                                                color: customer.total_due > 0 ? '#10b981' : 'var(--text-muted)',
                                                background: customer.total_due > 0 ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                                border: customer.total_due > 0 ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                                                opacity: customer.total_due <= 0 ? 0.4 : 1,
                                                cursor: customer.total_due <= 0 ? 'not-allowed' : 'pointer'
                                            }}
                                        >
                                            <Wallet size={15} />
                                        </button>

                                        {/* View Profile Ledger */}
                                        <button 
                                            className={styles.actionBtn} 
                                            onClick={() => router.push(`/customers/details?id=${customer.id}`)} 
                                            title="View Ledger & History"
                                            style={{ color: 'var(--primary)' }}
                                        >
                                            <Eye size={15} />
                                        </button>

                                        {/* Edit */}
                                        <button 
                                            className={styles.actionBtn}
                                            onClick={() => openEditModal(customer)}
                                            title="Edit Customer"
                                        >
                                            <Edit size={15} />
                                        </button>

                                        {/* Delete */}
                                        <button 
                                            className={styles.actionBtn}
                                            onClick={() => handleDelete(customer)}
                                            title="Delete Customer"
                                            style={{ color: 'var(--danger)' }}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Quick Receive Due Modal */}
            {dueModalCustomer && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--surface)', 
                        padding: '1.75rem', 
                        borderRadius: 'var(--radius-lg)', 
                        width: '100%',
                        maxWidth: '440px', 
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Receive Due (বাকি গ্রহণ)</h2>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Customer: <b>{dueModalCustomer.name}</b></div>
                            </div>
                            <button onClick={() => setDueModalCustomer(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={22} />
                            </button>
                        </div>

                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.9rem' }}>মোট বাকি:</span>
                            <span style={{ color: '#ef4444', fontSize: '1.35rem', fontWeight: 800 }}>৳ {dueModalCustomer.total_due.toFixed(2)}</span>
                        </div>

                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Payment Amount (৳) *</label>
                            <input 
                                type="number" 
                                min="0"
                                max={dueModalCustomer.total_due}
                                value={quickDueAmount} 
                                onChange={e => handleAmountInputChange(e.target.value, dueModalCustomer.total_due)} 
                                style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '1.15rem', fontWeight: 'bold', color: 'var(--text-main)' }}
                                placeholder="0.00"
                            />
                            
                            {/* High contrast clear shortcut buttons */}
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                <button 
                                    type="button"
                                    onClick={() => handleAmountInputChange(Math.min(100, dueModalCustomer.total_due).toString(), dueModalCustomer.total_due)} 
                                    style={{ flex: 1, padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                    ৳ 100
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleAmountInputChange(Math.min(500, dueModalCustomer.total_due).toString(), dueModalCustomer.total_due)} 
                                    style={{ flex: 1, padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                                >
                                    ৳ 500
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleAmountInputChange(dueModalCustomer.total_due.toString(), dueModalCustomer.total_due)} 
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
                                    const isSelected = quickDueMethod === pm.id;
                                    return (
                                        <button
                                            key={pm.id}
                                            type="button"
                                            onClick={() => setQuickDueMethod(pm.id)}
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

                        {quickDueMethod !== 'cash' && (
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Reference / TrxID</label>
                                <input type="text" value={quickDueRef} onChange={e => setQuickDueRef(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                        )}

                        <div style={{ marginBottom: '1.25rem' }}>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.875rem' }}>Notes (Optional)</label>
                            <input type="text" value={quickDueNotes} onChange={e => setQuickDueNotes(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                        </div>

                        {Number(quickDueAmount) > 0 && (
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: '#10b981', fontWeight: 600, fontSize: '0.875rem' }}>New Due Balance:</span>
                                <span style={{ color: '#10b981', fontSize: '1.15rem', fontWeight: 800 }}>৳ {Math.max(0, dueModalCustomer.total_due - Number(quickDueAmount)).toFixed(2)}</span>
                            </div>
                        )}

                        <button 
                            onClick={handleQuickReceiveDue}
                            disabled={processingDue || !quickDueAmount || Number(quickDueAmount) <= 0}
                            style={{ width: '100%', padding: '0.85rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '1rem', cursor: (processingDue || !quickDueAmount || Number(quickDueAmount) <= 0) ? 'not-allowed' : 'pointer', opacity: (processingDue || !quickDueAmount || Number(quickDueAmount) <= 0) ? 0.5 : 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                        >
                            {processingDue ? 'Processing...' : <><Check size={18} /> Confirm Due Payment</>}
                        </button>
                    </div>
                </div>
            )}

            {/* Glass Modal overlay for Add/Edit Customer */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(15, 23, 42, 0.55)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem'
                }}>
                    <div style={{
                        background: 'var(--surface)', 
                        padding: '1.75rem', 
                        borderRadius: 'var(--radius-lg)', 
                        width: '100%',
                        maxWidth: '460px', 
                        border: '1px solid var(--border)',
                        boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                            </h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={22} />
                            </button>
                        </div>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Name *</label>
                                <input 
                                    required 
                                    type="text" 
                                    placeholder="Customer Full Name"
                                    value={formData.name} 
                                    onChange={e => setFormData({...formData, name: e.target.value})} 
                                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Phone Number</label>
                                <input 
                                    type="text" 
                                    placeholder="017xxxxxxxx"
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Email Address</label>
                                <input 
                                    type="email" 
                                    placeholder="customer@email.com"
                                    value={formData.email} 
                                    onChange={e => setFormData({...formData, email: e.target.value})} 
                                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Address</label>
                                <input 
                                    type="text" 
                                    placeholder="Street, City, Area"
                                    value={formData.address} 
                                    onChange={e => setFormData({...formData, address: e.target.value})} 
                                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} 
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.875rem', fontWeight: 600 }}>Notes / Special Tag</label>
                                <input 
                                    type="text" 
                                    placeholder="VIP customer, regular buyer, etc."
                                    value={formData.notes} 
                                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                                    style={{ width: '100%', padding: '0.65rem 0.75rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: 'var(--radius)' }} 
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={saving} 
                                style={{
                                    marginTop: '0.5rem',
                                    width: '100%', 
                                    padding: '0.85rem', 
                                    background: 'var(--primary)', 
                                    color: 'white', 
                                    border: 'none', 
                                    borderRadius: 'var(--radius)', 
                                    fontWeight: 700, 
                                    fontSize: '1rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.7 : 1
                                }}
                            >
                                {saving ? 'Saving...' : (editingCustomer ? 'Update Customer' : 'Save Customer')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
