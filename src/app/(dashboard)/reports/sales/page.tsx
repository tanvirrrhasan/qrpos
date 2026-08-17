'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function SalesReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month'); // today, yesterday, this_week, this_month, last_month

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];
    const allSaleItems = useLiveQuery(() => localDB.saleItems.toArray()) || [];

    const filteredSales = useMemo(() => {
        const now = new Date();
        const start = new Date();
        const end = new Date();
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        if (dateRange === 'today') {
            // Already set
        } else if (dateRange === 'yesterday') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else if (dateRange === 'this_week') {
            start.setDate(start.getDate() - start.getDay());
        } else if (dateRange === 'this_month') {
            start.setDate(1);
        } else if (dateRange === 'last_month') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0); // last day of prev month
        }

        return allSales.filter(s => {
            const sd = new Date(s.sale_date);
            return sd >= start && sd <= end && !s.is_returned; // excluding fully returned for simplicity, or we can just calculate Net Sales
        });
    }, [allSales, dateRange]);

    const metrics = useMemo(() => {
        const totalSales = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const count = filteredSales.length;
        const avg = count > 0 ? totalSales / count : 0;
        return { totalSales, count, avg };
    }, [filteredSales]);

    const chartData = useMemo(() => {
        // Group by Date (YYYY-MM-DD)
        const groups: Record<string, number> = {};
        filteredSales.forEach(s => {
            const dateStr = s.sale_date.split('T')[0];
            groups[dateStr] = (groups[dateStr] || 0) + s.total;
        });
        
        return Object.keys(groups).sort().map(date => ({
            date,
            sales: groups[date]
        }));
    }, [filteredSales]);

    const exportToCSV = () => {
        if (filteredSales.length === 0) return alert('No data to export');
        
        const headers = ['Invoice No', 'Date', 'Customer ID', 'Total', 'Due', 'Payment Status', 'Returned'];
        const csvRows = [headers.join(',')];

        filteredSales.forEach(s => {
            const row = [
                s.invoice_no,
                new Date(s.sale_date).toLocaleString().replace(/,/g, ''),
                s.customer_id || 'Walk-in',
                s.total.toFixed(2),
                s.due_amount.toFixed(2),
                s.payment_status,
                s.is_returned ? 'Yes' : 'No'
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('href', url);
        a.setAttribute('download', `sales_report_${dateRange}.csv`);
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>Sales Report</h1>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)'}}
                    >
                        <option value="today">Today</option>
                        <option value="yesterday">Yesterday</option>
                        <option value="this_week">This Week</option>
                        <option value="this_month">This Month</option>
                        <option value="last_month">Last Month</option>
                    </select>
                    <button onClick={exportToCSV} style={{padding: '0.5rem 1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <Download size={16} /> Export CSV
                    </button>
                    <button onClick={() => window.print()} style={{padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Total Sales (মোট বিক্রি)</p>
                    <h2 style={{margin: 0, fontSize: '2rem'}}>৳ {metrics.totalSales.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Transactions (বিক্রি সংখ্যা)</p>
                    <h2 style={{margin: 0, fontSize: '2rem'}}>{metrics.count}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Average Sale (গড় বিক্রি)</p>
                    <h2 style={{margin: 0, fontSize: '2rem'}}>৳ {metrics.avg.toFixed(2)}</h2>
                </div>
            </div>

            {/* Chart */}
            <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem'}}>
                <h3 style={{margin: '0 0 1.5rem 0'}}>Sales Trend</h3>
                <div style={{height: '300px', width: '100%'}}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#888'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fontSize: 12, fill: '#888'}} axisLine={false} tickLine={false} tickFormatter={(val) => `৳${val}`} />
                            <Tooltip formatter={(value: any) => [`৳${Number(value || 0).toFixed(2)}`, 'Sales']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                            <Line type="monotone" dataKey="sales" stroke="var(--primary)" strokeWidth={3} dot={{r: 4, fill: 'var(--primary)'}} activeDot={{r: 6}} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Data Table */}
            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)'}}>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Date</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Invoice No</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Status</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSales.map(sale => (
                            <tr key={sale.id} style={{borderBottom: '1px solid var(--border)'}}>
                                <td style={{padding: '1rem'}}>{new Date(sale.sale_date).toLocaleString()}</td>
                                <td style={{padding: '1rem', fontWeight: 600, color: 'var(--primary)'}}>{sale.invoice_no}</td>
                                <td style={{padding: '1rem', textTransform: 'capitalize'}}>{sale.payment_status}</td>
                                <td style={{padding: '1rem', textAlign: 'right', fontWeight: 600}}>৳ {sale.total.toFixed(2)}</td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No sales data for this period.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
