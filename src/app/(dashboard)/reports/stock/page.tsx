'use client'

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function StockReportPage() {
    const router = useRouter();

    const allProducts = useLiveQuery(() => localDB.products.toArray()) || [];
    const allCategories = useLiveQuery(() => localDB.categories.toArray()) || [];

    const metrics = useMemo(() => {
        let totalValue = 0;
        let inStock = 0;
        let lowStock = 0;
        let outOfStock = 0;

        allProducts.forEach(p => {
            const stock = p.stock || 0;
            const price = p.purchase_price || 0;
            totalValue += stock * price;

            if (stock <= 0) outOfStock++;
            else if (stock <= (p.low_stock_alert || 5)) lowStock++;
            else inStock++;
        });

        return { totalValue, inStock, lowStock, outOfStock };
    }, [allProducts]);

    const categoryData = useMemo(() => {
        const catMap = new Map(allCategories.map(c => [c.id, c.name]));
        const group: Record<string, number> = {};
        
        allProducts.forEach(p => {
            if (p.stock > 0) {
                const catName = p.category_id ? (catMap.get(p.category_id) || 'Uncategorized') : 'Uncategorized';
                group[catName] = (group[catName] || 0) + (p.stock * (p.purchase_price || 0));
            }
        });

        return Object.keys(group).map(name => ({
            name,
            value: group[name]
        })).sort((a,b) => b.value - a.value);
    }, [allProducts, allCategories]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ffc658'];

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>Stock Report</h1>
                </div>
                <button onClick={() => window.print()} style={{padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <Printer size={16} /> Print
                </button>
            </div>

            {/* Metrics */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Total Stock Value</p>
                    <h2 style={{margin: 0, fontSize: '1.75rem'}}>৳ {metrics.totalValue.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>In Stock (Healthy)</p>
                    <h2 style={{margin: 0, fontSize: '1.75rem', color: 'var(--success)'}}>{metrics.inStock} items</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Low Stock</p>
                    <h2 style={{margin: 0, fontSize: '1.75rem', color: 'var(--warning)'}}>{metrics.lowStock} items</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Out of Stock</p>
                    <h2 style={{margin: 0, fontSize: '1.75rem', color: 'var(--danger)'}}>{metrics.outOfStock} items</h2>
                </div>
            </div>

            {/* Charts & Tables */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
                <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <h3 style={{margin: '0 0 1.5rem 0'}}>Stock Value by Category</h3>
                    {categoryData.length > 0 ? (
                        <div style={{height: '300px'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({name, percent}: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {categoryData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `৳${Number(value || 0).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p style={{color: 'var(--text-muted)'}}>No stock data available.</p>
                    )}
                </div>

                <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <h3 style={{margin: '0 0 1.5rem 0'}}>Category Breakdown (Table)</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--border)', color: 'var(--text-muted)'}}>
                                <th style={{padding: '0.5rem 0'}}>Category</th>
                                <th style={{padding: '0.5rem 0', textAlign: 'right'}}>Stock Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryData.map((cat, idx) => (
                                <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                                    <td style={{padding: '0.75rem 0'}}>{cat.name}</td>
                                    <td style={{padding: '0.75rem 0', textAlign: 'right', fontWeight: 600}}>৳ {cat.value.toFixed(2)}</td>
                                </tr>
                            ))}
                            {categoryData.length === 0 && (
                                <tr>
                                    <td colSpan={2} style={{textAlign: 'center', padding: '1rem', color: 'var(--text-muted)'}}>Empty</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
