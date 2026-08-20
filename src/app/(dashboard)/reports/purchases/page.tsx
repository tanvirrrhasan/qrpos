'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, ShoppingCart, Truck, CreditCard } from 'lucide-react';

export default function PurchaseReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month');

    const purchases = useLiveQuery(() => localDB.purchases.toArray()) || [];
    const suppliers = useLiveQuery(() => localDB.suppliers.toArray()) || [];

    const supplierMap = useMemo(() => {
        const map: Record<string, string> = {};
        suppliers.forEach(s => { map[s.id] = s.name; });
        return map;
    }, [suppliers]);

    const filteredPurchases = useMemo(() => {
        const start = new Date();
        const end = new Date();
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        if (dateRange === 'yesterday') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else if (dateRange === 'this_week') {
            start.setDate(start.getDate() - start.getDay());
        } else if (dateRange === 'this_month') {
            start.setDate(1);
        } else if (dateRange === 'last_month') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0);
        } else if (dateRange === 'all_time') {
            start.setTime(0);
        }

        return purchases.filter(p => {
            const pd = new Date(p.purchase_date || p.created_at);
            return pd >= start && pd <= end;
        });
    }, [purchases, dateRange]);

    const metrics = useMemo(() => {
        const totalAmount = filteredPurchases.reduce((sum, p) => sum + Number(p.total_amount || 0), 0);
        const totalPaid = filteredPurchases.reduce((sum, p) => sum + Number(p.paid_amount || 0), 0);
        const totalDue = filteredPurchases.reduce((sum, p) => sum + Number(p.due_amount || 0), 0);
        const count = filteredPurchases.length;
        return { totalAmount, totalPaid, totalDue, count };
    }, [filteredPurchases]);

    const exportToCSV = () => {
        if (filteredPurchases.length === 0) return alert('No data to export');
        
        const headers = ['Invoice / Ref', 'Supplier Name', 'Date', 'Total Amount (BDT)', 'Paid Amount', 'Due Amount', 'Status'];
        const csvRows = [headers.join(',')];

        filteredPurchases.forEach(p => {
            const supName = p.supplier_id && supplierMap[p.supplier_id] ? supplierMap[p.supplier_id] : 'General Supplier';
            const row = [
                `"${(p.invoice_no || p.id.slice(0,8)).replace(/"/g, '""')}"`,
                `"${supName.replace(/"/g, '""')}"`,
                new Date(p.purchase_date || p.created_at).toLocaleString().replace(/,/g, ''),
                Number(p.total_amount || 0).toFixed(2),
                Number(p.paid_amount || 0).toFixed(2),
                Number(p.due_amount || 0).toFixed(2),
                p.status || 'Received'
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `purchase_report_${dateRange}.csv`;
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>ক্রয় রিপোর্ট (Purchase Report)</h1>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', cursor: 'pointer'}}
                    >
                        <option value="today">Today (আজ)</option>
                        <option value="yesterday">Yesterday (গতকাল)</option>
                        <option value="this_week">This Week (এই সপ্তাহ)</option>
                        <option value="this_month">This Month (এই মাস)</option>
                        <option value="last_month">Last Month (গত মাস)</option>
                        <option value="all_time">All Time (সর্বমোট)</option>
                    </select>
                    <button onClick={exportToCSV} style={{padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600}}>
                        <Download size={16} /> Export CSV
                    </button>
                    <button onClick={() => window.print()} style={{padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600}}>
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <ShoppingCart size={16} color="var(--primary)" /> মোট ক্রয় বাজেট (Total Purchase)
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {metrics.totalAmount.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <CreditCard size={16} color="#10b981" /> পরিশোধিত টাকা (Paid)
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: '#10b981'}}>৳ {metrics.totalPaid.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <Truck size={16} color="#ef4444" /> সাপ্লায়ারের কাছে দেনা (Due)
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: '#ef4444'}}>৳ {metrics.totalDue.toFixed(2)}</h2>
                </div>
            </div>

            {/* Table */}
            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)', color: 'var(--text-muted)'}}>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Invoice / Ref</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Supplier Name (সাপ্লায়ার)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Date</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total (৳)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Paid / Due</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPurchases.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                    নির্দিষ্ট সময়ের মধ্যে কোনো ক্রয়ের রেকর্ড পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            filteredPurchases.map((p, i) => {
                                const supName = p.supplier_id && supplierMap[p.supplier_id] ? supplierMap[p.supplier_id] : 'General Supplier';
                                return (
                                    <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                        <td style={{padding: '1rem', fontWeight: 600, color: 'var(--primary)'}}>{p.invoice_no || p.id.slice(0,8)}</td>
                                        <td style={{padding: '1rem', color: 'var(--text-main)'}}>{supName}</td>
                                        <td style={{padding: '1rem', color: 'var(--text-muted)'}}>{new Date(p.purchase_date || p.created_at).toLocaleDateString()}</td>
                                        <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)'}}>
                                            ৳ {Number(p.total_amount || 0).toFixed(2)}
                                        </td>
                                        <td style={{padding: '1rem', textAlign: 'right', fontSize: '0.88rem'}}>
                                            <span style={{color: '#10b981', fontWeight: 600}}>৳ {Number(p.paid_amount || 0).toFixed(0)}</span>
                                            {Number(p.due_amount || 0) > 0 && (
                                                <span style={{color: '#ef4444', fontWeight: 600, marginLeft: '0.5rem'}}>(দেনা: ৳{Number(p.due_amount || 0).toFixed(0)})</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
