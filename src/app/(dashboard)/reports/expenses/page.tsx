'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, Receipt, Wallet, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ExpensesReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month');

    const expenses = useLiveQuery(() => localDB.expenses.toArray()) || [];
    const categories = useLiveQuery(() => localDB.expenseCategories.toArray()) || [];

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach(c => { map[c.id] = c.name; });
        return map;
    }, [categories]);

    const filteredExpenses = useMemo(() => {
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

        return expenses.filter(e => {
            const ed = new Date(e.expense_date || e.created_at);
            return ed >= start && ed <= end;
        });
    }, [expenses, dateRange]);

    const metrics = useMemo(() => {
        const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const count = filteredExpenses.length;
        const avg = count > 0 ? total / count : 0;
        return { total, count, avg };
    }, [filteredExpenses]);

    const categoryBreakdown = useMemo(() => {
        const stats: Record<string, number> = {};
        filteredExpenses.forEach(e => {
            const catName = e.category_id && categoryMap[e.category_id] ? categoryMap[e.category_id] : (e.description || 'General Expense');
            stats[catName] = (stats[catName] || 0) + Number(e.amount || 0);
        });

        return Object.keys(stats).map(cat => ({
            name: cat,
            amount: stats[cat]
        })).sort((a, b) => b.amount - a.amount);
    }, [filteredExpenses, categoryMap]);

    const exportToCSV = () => {
        if (filteredExpenses.length === 0) return alert('No data to export');
        
        const headers = ['Title / Reason', 'Category', 'Date', 'Amount (BDT)', 'Remarks'];
        const csvRows = [headers.join(',')];

        filteredExpenses.forEach(e => {
            const catName = e.category_id && categoryMap[e.category_id] ? categoryMap[e.category_id] : 'General';
            const row = [
                `"${(e.description || 'Expense').replace(/"/g, '""')}"`,
                `"${catName.replace(/"/g, '""')}"`,
                new Date(e.expense_date || e.created_at).toLocaleString().replace(/,/g, ''),
                Number(e.amount || 0).toFixed(2),
                `"${(e.description || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `expenses_report_${dateRange}.csv`;
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>খরচ রিপোর্ট (Expense Report)</h1>
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
                        <Receipt size={16} color="#ef4444" /> সর্বমোট মোট খরচ (Total Expenses)
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: '#ef4444'}}>৳ {metrics.total.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <Wallet size={16} color="var(--primary)" /> মোট খরচের এন্ট্রি সংখ্যা
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{metrics.count} টি</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <AlertCircle size={16} color="#f59e0b" /> গড় খরচের পরিমাণ
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {metrics.avg.toFixed(2)}</h2>
                </div>
            </div>

            {/* Expense Chart */}
            {categoryBreakdown.length > 0 && (
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.1rem'}}>Expense by Category (খাত অনুযায়ী খরচ)</h3>
                    <div style={{height: '260px', width: '100%'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryBreakdown}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} tickFormatter={(val) => `৳${val}`} />
                                <Tooltip formatter={(val: any) => [`৳${Number(val || 0).toFixed(2)}`, 'Expense']} contentStyle={{borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'}} />
                                <Bar dataKey="amount" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Table */}
            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)', color: 'var(--text-muted)'}}>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Expense Title (খাতের বিবরণ)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Category</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Date</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Amount (৳)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                    নির্দিষ্ট সময়ের মধ্যে কোনো খরচের এন্ট্রি পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            filteredExpenses.map((exp, i) => {
                                const catName = exp.category_id && categoryMap[exp.category_id] ? categoryMap[exp.category_id] : 'General';
                                return (
                                    <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                        <td style={{padding: '1rem', fontWeight: 600, color: 'var(--text-main)'}}>{exp.description || 'Expense'}</td>
                                        <td style={{padding: '1rem', color: 'var(--text-muted)'}}>{catName}</td>
                                        <td style={{padding: '1rem', color: 'var(--text-muted)'}}>{new Date(exp.expense_date || exp.created_at).toLocaleDateString()}</td>
                                        <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#ef4444'}}>
                                            ৳ {Number(exp.amount || 0).toFixed(2)}
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
