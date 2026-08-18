'use client'

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { Search, Plus, Edit, Trash, X, Eye } from 'lucide-react';
import styles from '../products/products.module.css'; // Reusing table styles
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'next/navigation';

export default function CustomersPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDue, setFilterDue] = useState<'all' | 'due' | 'no-due'>('all');
    const [showModal, setShowModal] = useState(false);
    const [storeId, setStoreId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
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
                collection = collection.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone || '').includes(searchTerm));
            }
            
            return collection.toArray().then(arr => {
                if (filterDue === 'due') return arr.filter(c => c.total_due > 0);
                if (filterDue === 'no-due') return arr.filter(c => c.total_due <= 0);
                return arr;
            });
        },
        [searchTerm, filterDue]
    );

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId || !formData.name) return;
        setSaving(true);
        try {
            const id = uuidv4();
            const payload = {
                id,
                store_id: storeId,
                name: formData.name,
                phone: formData.phone,
                address: formData.address,
                notes: formData.notes,
                total_due: 0,
                total_purchases: 0,
                purchase_count: 0,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Sync to remote
            const { error } = await supabase.from('customers').insert([payload]);
            if (error) throw error;

            // Save to local
            await localDB.customers.put(payload);
            
            setShowModal(false);
            setFormData({ name: '', phone: '', address: '', notes: '' });
        } catch (err: any) {
            console.error(err);
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <h1>Customers</h1>
                <button className={styles.addButton} onClick={() => setShowModal(true)}>
                    <Plus size={20} /> Add Customer
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBar} style={{flex: 1}}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search by name or phone..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{display: 'flex', gap: '0.5rem'}}>
                    <select 
                        value={filterDue} 
                        onChange={e => setFilterDue(e.target.value as any)}
                        style={{padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)'}}
                    >
                        <option value="all">All Customers</option>
                        <option value="due">Has Due (বাকি আছে)</option>
                        <option value="no-due">No Due (বাকি নেই)</option>
                    </select>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Total Due</th>
                            <th>Total Spent</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customers?.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                                    No customers found. Add your first customer!
                                </td>
                            </tr>
                        ) : customers?.map(customer => (
                            <tr key={customer.id}>
                                <td data-label="Name">
                                    <div className={styles.productName}>{customer.name}</div>
                                    <div className={styles.productBrand}>{customer.address || '-'}</div>
                                </td>
                                <td data-label="Phone">{customer.phone || '-'}</td>
                                <td data-label="Total Due">
                                    <span className={customer.total_due > 0 ? styles.stockLow : styles.stockGood}>
                                        ৳ {customer.total_due.toFixed(2)}
                                    </span>
                                </td>
                                <td data-label="Total Spent">৳ {customer.total_purchases?.toFixed(2) || '0.00'}</td>
                                <td data-label="Actions">
                                    <div className={styles.actions}>
                                        <button className={styles.actionBtn} onClick={() => router.push(`/customers/details?id=${customer.id}`)} title="View Profile"><Eye size={16} style={{color: 'var(--primary)'}} /></button>
                                        <button className={styles.actionBtn}><Edit size={16} /></button>
                                        <button className={styles.actionBtn}><Trash size={16} style={{color: 'var(--danger)'}} /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Simple Modal overlay for Add Customer */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        background: 'var(--surface)', padding: '2rem', borderRadius: '8px', 
                        width: '400px', border: '1px solid var(--border)'
                    }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem'}}>
                            <h2>Add Customer</h2>
                            <button onClick={() => setShowModal(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem'}}>Name *</label>
                                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={{width: '100%', padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px'}} />
                            </div>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem'}}>Phone</label>
                                <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{width: '100%', padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px'}} />
                            </div>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem'}}>Address</label>
                                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} style={{width: '100%', padding: '0.5rem', background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--text-main)', borderRadius: '4px'}} />
                            </div>
                            <button type="submit" disabled={saving} style={{width: '100%', padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer'}}>
                                {saving ? 'Saving...' : 'Save Customer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
