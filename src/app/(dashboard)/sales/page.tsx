'use client'

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { Search, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import styles from '../products/products.module.css';

export default function SalesHistoryPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const data = useLiveQuery(
        async () => {
            let collection = localDB.sales.toCollection();
            if (searchTerm) {
                collection = collection.filter(s => s.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()));
            }
            const salesList = await collection.reverse().toArray();
            const customers = await localDB.customers.toArray();
            const customerMap = new Map(customers.map(c => [c.id, c.name]));
            return salesList.map(sale => ({
                ...sale,
                customer_name: sale.customer_id ? (customerMap.get(sale.customer_id) || 'Unknown') : 'Walk-in Customer'
            }));
        },
        [searchTerm]
    );

    return (
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <h1>Sales History</h1>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBar}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search by Invoice No..." 
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
                            <th>Invoice No</th>
                            <th>Customer</th>
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
                                <td colSpan={8} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                                    No sales records found.
                                </td>
                            </tr>
                        ) : data?.map(sale => (
                            <tr key={sale.id}>
                                <td data-label="Date">{new Date(sale.sale_date).toLocaleDateString()} <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{new Date(sale.sale_date).toLocaleTimeString()}</span></td>
                                <td data-label="Invoice No" style={{fontWeight: 600, color: 'var(--primary)'}}>{sale.invoice_no}</td>
                                <td data-label="Customer">{sale.customer_name}</td>
                                <td data-label="Total" style={{fontWeight: 600}}>৳ {sale.total.toFixed(2)}</td>
                                <td data-label="Paid" style={{color: 'var(--success)', fontWeight: 500}}>৳ {sale.paid_amount.toFixed(2)}</td>
                                <td data-label="Due" style={{color: sale.due_amount > 0 ? 'var(--danger)' : 'inherit'}}>৳ {sale.due_amount.toFixed(2)}</td>
                                <td data-label="Status">
                                    <span className={sale.payment_status === 'paid' ? styles.stockGood : (sale.payment_status === 'partial' ? styles.stockLow : styles.stockOut)}>
                                        {sale.payment_status.toUpperCase()}
                                    </span>
                                </td>
                                <td data-label="Actions">
                                    <button 
                                        className={styles.actionBtn} 
                                        onClick={() => router.push(`/sales/details?id=${sale.id}`)}
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
