'use client'

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { Search, Eye, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '../products/products.module.css';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function PurchasesPage() {
    const { hasPermission } = useAuth();
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const data = useLiveQuery(
        async () => {
            let collection = localDB.purchases.toCollection();
            if (searchTerm) {
                collection = collection.filter(p => (p.reference_no || '').toLowerCase().includes(searchTerm.toLowerCase()));
            }
            const purchaseList = await collection.reverse().toArray();
            const suppliers = await localDB.suppliers.toArray();
            const supplierMap = new Map(suppliers.map(s => [s.id, s.name]));
            
            // To get items count efficiently
            const purchaseItems = await localDB.purchaseItems.toArray();
            const itemCountMap = purchaseItems.reduce((acc, item) => {
                acc[item.purchase_id] = (acc[item.purchase_id] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return purchaseList.map(purchase => ({
                ...purchase,
                supplier_name: purchase.supplier_id ? (supplierMap.get(purchase.supplier_id) || 'Unknown Supplier') : 'Unknown',
                items_count: itemCountMap[purchase.id] || 0
            }));
        },
        [searchTerm]
    );

    if (!hasPermission('can_manage_purchases')) {
        return (
            <div className={styles.productsPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view purchases.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <h1>Purchases / Stock-In</h1>
                <button className={styles.addButton} onClick={() => router.push('/purchases/add')}>
                    <Plus size={20} /> Add Purchase
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBar}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search by Reference No..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference No</th>
                            <th>Supplier</th>
                            <th>Items</th>
                            <th>Total</th>
                            <th>Paid</th>
                            <th>Due</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data?.length === 0 ? (
                            <tr>
                                <td colSpan={9} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                                    No purchase records found.
                                </td>
                            </tr>
                        ) : data?.map(purchase => (
                            <tr key={purchase.id}>
                                <td data-label="Date">{new Date(purchase.purchase_date).toLocaleDateString()} <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{new Date(purchase.purchase_date).toLocaleTimeString()}</span></td>
                                <td data-label="Reference No" style={{fontWeight: 600, color: 'var(--primary)'}}>{purchase.reference_no || '-'}</td>
                                <td data-label="Supplier">{purchase.supplier_name}</td>
                                <td data-label="Items">{purchase.items_count}</td>
                                <td data-label="Total" style={{fontWeight: 600}}>৳ {purchase.total.toFixed(2)}</td>
                                <td data-label="Paid" style={{color: 'var(--success)', fontWeight: 500}}>৳ {purchase.paid_amount.toFixed(2)}</td>
                                <td data-label="Due" style={{color: purchase.due_amount > 0 ? 'var(--danger)' : 'inherit'}}>৳ {purchase.due_amount.toFixed(2)}</td>
                                <td data-label="Status">
                                    <span className={purchase.payment_status === 'paid' ? styles.stockGood : (purchase.payment_status === 'partial' ? styles.stockLow : styles.stockOut)}>
                                        {purchase.payment_status.toUpperCase()}
                                    </span>
                                </td>
                                <td data-label="Actions">
                                    <button 
                                        className={styles.actionBtn} 
                                        onClick={() => router.push(`/purchases/${purchase.id}`)}
                                        title="View Details"
                                        style={{display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.25rem 0.5rem'}}
                                    >
                                        <Eye size={14} /> View
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
