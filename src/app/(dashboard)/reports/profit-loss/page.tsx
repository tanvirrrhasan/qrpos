'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer } from 'lucide-react';

export default function ProfitLossPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month'); // today, yesterday, this_week, this_month, last_month, all_time

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];
    const allSaleItems = useLiveQuery(() => localDB.saleItems.toArray()) || [];
    const allExpenses = useLiveQuery(() => localDB.expenses.toArray()) || [];

    const dateFilter = (dateStr: string) => {
        if (dateRange === 'all_time') return true;

        const date = new Date(dateStr);
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
            end.setDate(0); 
        }

        return date >= start && date <= end;
    };

    const metrics = useMemo(() => {
        const filteredSales = allSales.filter(s => !s.is_returned && dateFilter(s.sale_date));
        const saleIds = new Set(filteredSales.map(s => s.id));
        
        const filteredSaleItems = allSaleItems.filter(item => saleIds.has(item.sale_id));
        const filteredExpenses = allExpenses.filter(e => dateFilter(e.expense_date));

        const revenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
        // COGS = sum of (qty * purchase_price)
        const cogs = filteredSaleItems.reduce((sum, item) => sum + (item.quantity * item.purchase_price), 0);
        
        const grossProfit = revenue - cogs;
        const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
        const netProfit = grossProfit - totalExpenses;
        const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

        return { revenue, cogs, grossProfit, totalExpenses, netProfit, margin };
    }, [allSales, allSaleItems, allExpenses, dateRange]);

    return (
        <div style={{padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>Profit & Loss Report</h1>
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
                        <option value="all_time">All Time</option>
                    </select>
                    <button onClick={() => window.print()} style={{padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '2rem', boxShadow: 'var(--shadow-sm)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem'}}>
                    <span style={{fontSize: '1.1rem', color: 'var(--text-muted)'}}>Revenue (বিক্রি)</span>
                    <span style={{fontSize: '1.1rem', fontWeight: 600}}>৳ {metrics.revenue.toFixed(2)}</span>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '2px solid var(--border)', marginBottom: '1rem'}}>
                    <span style={{fontSize: '1.1rem', color: 'var(--text-muted)'}}>Cost of Goods Sold (পণ্য খরচ)</span>
                    <span style={{fontSize: '1.1rem', fontWeight: 600}}>৳ {metrics.cogs.toFixed(2)}</span>
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem'}}>
                    <span style={{fontSize: '1.25rem', fontWeight: 600}}>Gross Profit</span>
                    <span style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)'}}>৳ {metrics.grossProfit.toFixed(2)}</span>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '2px solid var(--border)', marginBottom: '1rem'}}>
                    <span style={{fontSize: '1.1rem', color: 'var(--text-muted)'}}>Total Expenses (অন্যান্য খরচ)</span>
                    <span style={{fontSize: '1.1rem', fontWeight: 600, color: 'var(--danger)'}}>- ৳ {metrics.totalExpenses.toFixed(2)}</span>
                </div>

                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
                    <span style={{fontSize: '1.5rem', fontWeight: 700}}>Net Profit</span>
                    <span style={{fontSize: '1.5rem', fontWeight: 800, color: metrics.netProfit >= 0 ? 'var(--success)' : 'var(--danger)'}}>
                        ৳ {metrics.netProfit.toFixed(2)}
                    </span>
                </div>

                <div style={{textAlign: 'right', color: 'var(--text-muted)'}}>
                    Profit Margin: <strong style={{color: metrics.margin >= 0 ? 'var(--success)' : 'var(--danger)'}}>{metrics.margin.toFixed(1)}%</strong>
                </div>
            </div>
        </div>
    );
}
