'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, WalletCards, CreditCard, Banknote, Landmark } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#e11d48', '#8b5cf6', '#f59e0b', '#06b6d4', '#64748b'];

export default function PaymentsReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month');

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];

    const filteredSales = useMemo(() => {
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

        return allSales.filter(s => {
            const sd = new Date(s.sale_date);
            return sd >= start && sd <= end && !s.is_returned;
        });
    }, [allSales, dateRange]);

    const paymentBreakdown = useMemo(() => {
        const stats: Record<string, { method: string; count: number; total: number }> = {};

        filteredSales.forEach(s => {
            const pm = s.payment_method || 'cash';
            const formattedMethod = pm.charAt(0).toUpperCase() + pm.slice(1);

            if (!stats[formattedMethod]) {
                stats[formattedMethod] = { method: formattedMethod, count: 0, total: 0 };
            }

            stats[formattedMethod].count += 1;
            stats[formattedMethod].total += s.paid_amount || (s.total - s.due_amount);
        });

        return Object.values(stats).sort((a, b) => b.total - a.total);
    }, [filteredSales]);

    const totalCollected = useMemo(() => {
        return paymentBreakdown.reduce((sum, p) => sum + p.total, 0);
    }, [paymentBreakdown]);

    const exportToCSV = () => {
        if (paymentBreakdown.length === 0) return alert('No data to export');
        
        const headers = ['Payment Method', 'Transactions Count', 'Total Collected (BDT)', 'Share %'];
        const csvRows = [headers.join(',')];

        paymentBreakdown.forEach(p => {
            const share = totalCollected > 0 ? ((p.total / totalCollected) * 100).toFixed(1) : '0';
            const row = [
                `"${p.method}"`,
                p.count,
                p.total.toFixed(2),
                `${share}%`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_report_${dateRange}.csv`;
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>পেমেন্ট মেথড রিপোর্ট (Payment Report)</h1>
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
                        <WalletCards size={16} color="var(--primary)" /> মোট আদায়কৃত পেমেন্ট (Collected)
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {totalCollected.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <Banknote size={16} color="#10b981" /> প্রধান পেমেন্ট মাধ্যম
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#10b981'}}>
                        {paymentBreakdown[0]?.method || 'Cash'}
                    </h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <CreditCard size={16} color="#8b5cf6" /> পেমেন্ট মাধ্যমের সংখ্যা
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{paymentBreakdown.length} টি</h2>
                </div>
            </div>

            {/* Pie Chart */}
            {paymentBreakdown.length > 0 && (
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.1rem'}}>Payment Method Breakdown (পেমেন্ট চ্যানেল শতাংশ)</h3>
                    <div style={{height: '260px', width: '100%'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={paymentBreakdown} dataKey="total" nameKey="method" cx="50%" cy="50%" outerRadius={95} label={(e) => `${e.method}: ৳${e.value.toFixed(0)}`}>
                                    {paymentBreakdown.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => [`৳${Number(val || 0).toFixed(2)}`, 'Total']} contentStyle={{borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'}} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)', color: 'var(--text-muted)'}}>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Payment Method (পেমেন্ট মাধ্যম)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>Transactions</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total Collected (৳)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Share (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paymentBreakdown.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                    নির্দিষ্ট সময়ের মধ্যে কোনো পেমেন্ট তথ্য পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            paymentBreakdown.map((item, i) => {
                                const share = totalCollected > 0 ? ((item.total / totalCollected) * 100).toFixed(1) : '0';
                                return (
                                    <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                        <td style={{padding: '1rem', fontWeight: 600, color: 'var(--text-main)'}}>{item.method}</td>
                                        <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{item.count} টি মেমো</td>
                                        <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)'}}>
                                            ৳ {item.total.toFixed(2)}
                                        </td>
                                        <td style={{padding: '1rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)'}}>
                                            {share}%
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
