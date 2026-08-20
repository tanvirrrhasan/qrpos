'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, Users, Award, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StaffPerformanceReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month');

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];
    const staffList = useLiveQuery(() => localDB.staff.toArray()) || [];

    const staffMap = useMemo(() => {
        const map: Record<string, { name: string; role: string }> = {};
        staffList.forEach(s => {
            map[s.id] = { name: s.full_name, role: s.role };
        });
        return map;
    }, [staffList]);

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

    const staffPerformance = useMemo(() => {
        const stats: Record<string, { staffName: string; role: string; count: number; totalRevenue: number; totalDiscount: number }> = {};

        filteredSales.forEach(s => {
            const staffId = s.staff_id || 'owner_default';
            const staffInfo = staffMap[staffId] || { name: 'Owner / General Cashier', role: 'Manager' };
            const key = staffInfo.name;

            if (!stats[key]) {
                stats[key] = {
                    staffName: staffInfo.name,
                    role: staffInfo.role,
                    count: 0,
                    totalRevenue: 0,
                    totalDiscount: 0
                };
            }

            stats[key].count += 1;
            stats[key].totalRevenue += s.total;
            stats[key].totalDiscount += Number(s.discount_amount || 0);
        });

        return Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredSales, staffMap]);

    const metrics = useMemo(() => {
        const totalSales = staffPerformance.reduce((sum, s) => sum + s.totalRevenue, 0);
        const topStaff = staffPerformance[0]?.staffName || 'N/A';
        const activeStaffCount = staffPerformance.length;
        return { totalSales, topStaff, activeStaffCount };
    }, [staffPerformance]);

    const exportToCSV = () => {
        if (staffPerformance.length === 0) return alert('No data to export');
        
        const headers = ['Staff Name', 'Role', 'Invoices Handled', 'Total Sales (BDT)', 'Avg Sale / Invoice', 'Discounts Given'];
        const csvRows = [headers.join(',')];

        staffPerformance.forEach(s => {
            const avg = s.count > 0 ? (s.totalRevenue / s.count).toFixed(2) : '0';
            const row = [
                `"${s.staffName.replace(/"/g, '""')}"`,
                `"${s.role.replace(/"/g, '""')}"`,
                s.count,
                s.totalRevenue.toFixed(2),
                avg,
                s.totalDiscount.toFixed(2)
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `staff_performance_report_${dateRange}.csv`;
        a.click();
    };

    return (
        <div style={{padding: '2rem', maxWidth: '1000px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>কর্মী বিক্রয় পারফরম্যান্স রিপোর্ট (Staff Sales)</h1>
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
                        <Users size={16} color="var(--primary)" /> সক্রিয় ক্যাশিয়ার/কর্মী
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{metrics.activeStaffCount} জন</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <Award size={16} color="#10b981" /> শীর্ষ সেলস পারফর্মার
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-main)'}}>{metrics.topStaff}</h2>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                        <ShieldCheck size={16} color="#f59e0b" /> সর্বমোট প্রসেসকৃত বিক্রি
                    </div>
                    <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {metrics.totalSales.toFixed(2)}</h2>
                </div>
            </div>

            {/* Staff Chart */}
            {staffPerformance.length > 0 && (
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1.5rem 0', fontSize: '1.1rem'}}>Staff Sales Comparison (কর্মীদের মোট বিক্রি)</h3>
                    <div style={{height: '260px', width: '100%'}}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={staffPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="staffName" tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} />
                                <YAxis tick={{fontSize: 12, fill: 'var(--text-muted)'}} axisLine={false} tickLine={false} tickFormatter={(val) => `৳${val}`} />
                                <Tooltip formatter={(val: any) => [`৳${Number(val || 0).toFixed(2)}`, 'Sales']} contentStyle={{borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)'}} />
                                <Bar dataKey="totalRevenue" fill="#10b981" radius={[4, 4, 0, 0]} />
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
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Staff Name (কর্মীর নাম)</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Role</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>Invoices Processed</th>
                            <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total Sales (৳)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staffPerformance.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                    নির্দিষ্ট সময়ের মধ্যে কোনো কর্মীর বিক্রি সংক্রান্ত তথ্য পাওয়া যায়নি।
                                </td>
                            </tr>
                        ) : (
                            staffPerformance.map((item, i) => (
                                <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                    <td style={{padding: '1rem', fontWeight: 600, color: 'var(--text-main)'}}>{item.staffName}</td>
                                    <td style={{padding: '1rem', color: 'var(--text-muted)'}}>{item.role}</td>
                                    <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{item.count} টি মেমো</td>
                                    <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#10b981'}}>
                                        ৳ {item.totalRevenue.toFixed(2)}
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
