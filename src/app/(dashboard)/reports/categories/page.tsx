'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, Tags, PieChart as PieIcon, Layers } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export default function CategorySalesReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month');

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];
    const allSaleItems = useLiveQuery(() => localDB.saleItems.toArray()) || [];
    const products = useLiveQuery(() => localDB.products.toArray()) || [];
    const categories = useLiveQuery(() => localDB.categories.toArray()) || [];

    const categoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        categories.forEach(c => { map[c.id] = c.name; });
        return map;
    }, [categories]);

    const productCategoryMap = useMemo(() => {
        const map: Record<string, string> = {};
        products.forEach(p => { 
            const catName = p.category_id && categoryMap[p.category_id] ? categoryMap[p.category_id] : 'Uncategorized (সাধারণ)';
            map[p.name] = catName;
        });
        return map;
    }, [products, categoryMap]);

    const filteredSaleIds = useMemo(() => {
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

        const validSaleIds = new Set<string>();
        allSales.forEach(s => {
            const sd = new Date(s.sale_date);
            if (sd >= start && sd <= end && !s.is_returned) {
                validSaleIds.add(s.id);
            }
        });

        return validSaleIds;
    }, [allSales, dateRange]);

    const categorySalesData = useMemo(() => {
        const stats: Record<string, { category: string; quantity: number; revenue: number }> = {};

        allSaleItems.forEach(item => {
            if (filteredSaleIds.has(item.sale_id)) {
                const catName = productCategoryMap[item.product_name] || 'Uncategorized (সাধারণ)';
                if (!stats[catName]) {
                    stats[catName] = { category: catName, quantity: 0, revenue: 0 };
                }
                stats[catName].quantity += item.quantity;
                stats[catName].revenue += item.total;
            }
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [allSaleItems, filteredSaleIds, productCategoryMap]);

    const totalCategoryRevenue = useMemo(() => {
        return categorySalesData.reduce((sum, c) => sum + c.revenue, 0);
    }, [categorySalesData]);

    const exportToCSV = () => {
        if (categorySalesData.length === 0) return alert('No data to export');
        
        const headers = ['Category Name', 'Items Sold Qty', 'Total Revenue (BDT)', 'Share %'];
        const csvRows = [headers.join(',')];

        categorySalesData.forEach(c => {
            const share = totalCategoryRevenue > 0 ? ((c.revenue / totalCategoryRevenue) * 100).toFixed(1) : '0';
            const row = [
                `"${c.category.replace(/"/g, '""')}"`,
                c.quantity,
                c.revenue.toFixed(2),
                `${share}%`
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `category_sales_report_${dateRange}.csv`;
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>ক্যাটেগরি-ভিত্তিক বিক্রি রিপোর্ট (Category Sales)</h1>
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
                        <Tags size={16} color="var(--primary)" /> মোট একটিভ ক্যাটেগরি
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{categorySalesData.length} টি</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <Layers size={16} color="#10b981" /> সর্বমোট ক্যাটেগরি বিক্রি
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {totalCategoryRevenue.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <PieIcon size={16} color="#f59e0b" /> শীর্ষ ক্যাটেগরি
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)'}}>
                        {categorySalesData[0]?.category || 'N/A'}
                    </h2>
                </div>
            </div>

            {/* Pie Chart */}
            {categorySalesData.length > 0 && (
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.1rem'}}>Category Revenue Distribution (ক্যাটেগরি বিক্রি শতাংশ)</h3>
                    <div style={{height: '280px', width: '100%'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={categorySalesData} dataKey="revenue" nameKey="category" cx="50%" cy="50%" outerRadius={100} label={(e: any) => `${e.category || ''}: ৳${(e.value || 0).toFixed(0)}`}>
                                    {categorySalesData.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: any) => [`৳${Number(val || 0).toFixed(2)}`, 'Revenue']} contentStyle={{borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'}} />
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
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Category Name (ক্যাটেগরি)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>Items Sold Qty</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total Revenue (৳)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Market Share (%)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categorySalesData.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                    নির্দিষ্ট সময়ের মধ্যে কোনো বিক্রয় তথ্য পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            categorySalesData.map((item, i) => {
                                const share = totalCategoryRevenue > 0 ? ((item.revenue / totalCategoryRevenue) * 100).toFixed(1) : '0';
                                return (
                                    <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                        <td style={{padding: '1rem', fontWeight: 600, color: 'var(--text-main)'}}>{item.category}</td>
                                        <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{item.quantity} পিস</td>
                                        <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)'}}>
                                            ৳ {item.revenue.toFixed(2)}
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
