'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, Package, TrendingUp, ShoppingBag } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ProductSalesReportPage() {
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
            if (p.category_id && categoryMap[p.category_id]) {
                map[p.name] = categoryMap[p.category_id];
            }
        });
        return map;
    }, [products, categoryMap]);

    const filteredSaleIds = useMemo(() => {
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

    const productSalesData = useMemo(() => {
        const stats: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};

        allSaleItems.forEach(item => {
            if (filteredSaleIds.has(item.sale_id)) {
                const key = item.product_name || 'Unknown Item';
                if (!stats[key]) {
                    stats[key] = {
                        name: key,
                        quantity: 0,
                        revenue: 0,
                        category: productCategoryMap[key] || 'General'
                    };
                }
                stats[key].quantity += item.quantity;
                stats[key].revenue += item.total;
            }
        });

        return Object.values(stats).sort((a, b) => b.revenue - a.revenue);
    }, [allSaleItems, filteredSaleIds, productCategoryMap]);

    const metrics = useMemo(() => {
        const totalRevenue = productSalesData.reduce((sum, p) => sum + p.revenue, 0);
        const totalQty = productSalesData.reduce((sum, p) => sum + p.quantity, 0);
        const uniqueProducts = productSalesData.length;
        const topProduct = productSalesData[0]?.name || 'N/A';
        return { totalRevenue, totalQty, uniqueProducts, topProduct };
    }, [productSalesData]);

    const chartData = useMemo(() => {
        return productSalesData.slice(0, 8).map(p => ({
            name: p.name.length > 12 ? p.name.slice(0, 12) + '...' : p.name,
            revenue: p.revenue,
            quantity: p.quantity
        }));
    }, [productSalesData]);

    const exportToCSV = () => {
        if (productSalesData.length === 0) return alert('No data to export');
        
        const headers = ['Product Name', 'Category', 'Quantity Sold', 'Total Revenue (BDT)', 'Avg Unit Revenue'];
        const csvRows = [headers.join(',')];

        productSalesData.forEach(p => {
            const avg = p.quantity > 0 ? (p.revenue / p.quantity).toFixed(2) : '0';
            const row = [
                `"${p.name.replace(/"/g, '""')}"`,
                `"${p.category.replace(/"/g, '""')}"`,
                p.quantity,
                p.revenue.toFixed(2),
                avg
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `product_sales_report_${dateRange}.csv`;
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>পণ্য-ভিত্তিক বিক্রি রিপোর্ট (Product Sales)</h1>
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
                        <Package size={16} color="var(--primary)" /> বিক্রিত মোট প্রোডাক্ট পদ
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{metrics.uniqueProducts} টির পদ</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <ShoppingBag size={16} color="#10b981" /> মোট বিক্রিত পিস/পরিমাণ
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{metrics.totalQty} পিস</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <TrendingUp size={16} color="#f59e0b" /> সেরা বিক্রিত পণ্য
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={metrics.topProduct}>
                        {metrics.topProduct}
                    </h2>
                </div>
            </div>

            {/* Bar Chart */}
            {chartData.length > 0 && (
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.1rem'}}>Top 8 Selling Products (সর্বোচ্চ বিক্রি হওয়া ৮টি পণ্য)</h3>
                    <div style={{height: '280px', width: '100%'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} tickFormatter={(val) => `৳${val}`} />
                                <Tooltip formatter={(value: any) => [`৳${Number(value || 0).toFixed(2)}`, 'Revenue']} contentStyle={{borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'}} />
                                <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Data Table */}
            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)', color: 'var(--text-muted)'}}>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Product Name (পণ্যের নাম)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Category</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>Qty Sold</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total Revenue (৳)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productSalesData.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                    নির্দিষ্ট সময়ের মধ্যে কোনো বিক্রয় তথ্য পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            productSalesData.map((item, i) => (
                                <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                    <td style={{padding: '1rem', fontWeight: 600, color: 'var(--text-main)'}}>{item.name}</td>
                                    <td style={{padding: '1rem', color: 'var(--text-muted)'}}>{item.category}</td>
                                    <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{item.quantity}</td>
                                    <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary)'}}>
                                        ৳ {item.revenue.toFixed(2)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}
