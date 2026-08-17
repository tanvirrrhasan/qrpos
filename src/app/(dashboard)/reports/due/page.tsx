'use client'

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

export default function DueReportPage() {
    const router = useRouter();

    const allCustomers = useLiveQuery(() => localDB.customers.toArray()) || [];

    const metrics = useMemo(() => {
        let totalReceivable = 0;
        let activeDueCustomers = 0;

        allCustomers.forEach(c => {
            if (c.total_due > 0) {
                totalReceivable += c.total_due;
                activeDueCustomers++;
            }
        });

        return { totalReceivable, activeDueCustomers };
    }, [allCustomers]);

    const topDueCustomers = useMemo(() => {
        return allCustomers
            .filter(c => c.total_due > 0)
            .sort((a,b) => b.total_due - a.total_due);
    }, [allCustomers]);

    // Calculate approximate aging based on last_purchase_at if available
    const agingData = useMemo(() => {
        let zeroTo7 = 0;
        let eightTo30 = 0;
        let thirtyPlus = 0;

        const now = new Date().getTime();

        topDueCustomers.forEach(c => {
            if (!c.last_purchase_at) {
                thirtyPlus += c.total_due;
            } else {
                const daysOld = (now - new Date(c.last_purchase_at).getTime()) / (1000 * 3600 * 24);
                if (daysOld <= 7) zeroTo7 += c.total_due;
                else if (daysOld <= 30) eightTo30 += c.total_due;
                else thirtyPlus += c.total_due;
            }
        });

        return [
            { name: '0-7 Days', value: zeroTo7 },
            { name: '8-30 Days', value: eightTo30 },
            { name: '30+ Days', value: thirtyPlus }
        ].filter(d => d.value > 0);
    }, [topDueCustomers]);

    const COLORS = ['#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>Due / Receivables Report</h1>
                </div>
                <button onClick={() => window.print()} style={{padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                    <Printer size={16} /> Print
                </button>
            </div>

            {/* Metrics */}
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem'}}>
                <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Total Receivable (মোট পাওনা)</p>
                    <h2 style={{margin: 0, fontSize: '2.5rem', color: 'var(--danger)'}}>৳ {metrics.totalReceivable.toFixed(2)}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-muted)'}}>Customers with Due (বাকি থাকা গ্রাহক)</p>
                    <h2 style={{margin: 0, fontSize: '2.5rem'}}>{metrics.activeDueCustomers}</h2>
                </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem'}}>
                {/* Chart */}
                <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <h3 style={{margin: '0 0 1.5rem 0'}}>Due Aging (Approximate)</h3>
                    {agingData.length > 0 ? (
                        <div style={{height: '300px'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={agingData}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={({name, percent}: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    >
                                        {agingData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => `৳${Number(value || 0).toFixed(2)}`} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p style={{color: 'var(--text-muted)'}}>No dues found.</p>
                    )}
                </div>

                {/* Table */}
                <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                    <h3 style={{margin: '2rem 2rem 1rem 2rem'}}>Customer-wise Due Breakdown</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                        <thead>
                            <tr style={{background: 'var(--background)'}}>
                                <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Customer Name</th>
                                <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Phone</th>
                                <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Last Purchase</th>
                                <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Due Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topDueCustomers.map(cust => (
                                <tr key={cust.id} style={{borderBottom: '1px solid var(--border)'}}>
                                    <td style={{padding: '1rem', fontWeight: 500}}>{cust.name}</td>
                                    <td style={{padding: '1rem'}}>{cust.phone || '-'}</td>
                                    <td style={{padding: '1rem'}}>{cust.last_purchase_at ? new Date(cust.last_purchase_at).toLocaleDateString() : '-'}</td>
                                    <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--danger)'}}>৳ {cust.total_due.toFixed(2)}</td>
                                </tr>
                            ))}
                            {topDueCustomers.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>No outstanding dues!</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
