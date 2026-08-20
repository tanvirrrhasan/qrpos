'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer, Download, Users, Award, ShieldCheck, UserCheck, Search, ChevronRight, ShoppingBag, Banknote, Percent, Eye, Calendar, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function StaffPerformanceReportPage() {
    const router = useRouter();
    const [dateRange, setDateRange] = useState('this_month');
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
    const [searchStaff, setSearchStaff] = useState('');

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];
    const staffList = useLiveQuery(() => localDB.staff.toArray()) || [];
    const allSaleItems = useLiveQuery(() => localDB.saleItems.toArray()) || [];

    // Map staff IDs to staff objects
    const staffMap = useMemo(() => {
        const map: Record<string, { id: string; name: string; role: string; phone?: string; email?: string }> = {};
        
        // Add default owner
        map['owner_default'] = { id: 'owner_default', name: 'Owner / System Admin', role: 'Owner' };
        
        staffList.forEach(s => {
            map[s.id] = { id: s.id, name: s.name, role: s.role, phone: s.phone, email: s.email };
        });
        
        return map;
    }, [staffList]);

    // All available staff list including owner option and unassigned
    const fullStaffList = useMemo(() => {
        const list: Array<{ id: string; name: string; role: string; phone?: string }> = [];
        
        // Add registered staff
        staffList.forEach(s => {
            list.push({ id: s.id, name: s.name, role: s.role, phone: s.phone });
        });

        // Add owner option if not in list
        const hasOwner = list.some(s => s.role.toLowerCase() === 'owner');
        if (!hasOwner) {
            list.unshift({ id: 'owner_default', name: 'Owner / Store Admin', role: 'Owner' });
        }

        return list;
    }, [staffList]);

    // Date range filter helper
    const getDateBounds = (range: string) => {
        const start = new Date();
        const end = new Date();
        start.setHours(0,0,0,0);
        end.setHours(23,59,59,999);

        if (range === 'today') {
            // today start/end is default
        } else if (range === 'yesterday') {
            start.setDate(start.getDate() - 1);
            end.setDate(end.getDate() - 1);
        } else if (range === 'this_week') {
            start.setDate(start.getDate() - start.getDay());
        } else if (range === 'this_month') {
            start.setDate(1);
        } else if (range === 'last_month') {
            start.setMonth(start.getMonth() - 1);
            start.setDate(1);
            end.setDate(0);
        } else if (range === 'all_time') {
            start.setTime(0);
        }
        return { start, end };
    };

    // Filter sales by date range
    const filteredSales = useMemo(() => {
        const { start, end } = getDateBounds(dateRange);

        return allSales.filter(s => {
            const sd = new Date(s.sale_date || s.created_at);
            return sd >= start && sd <= end && !s.is_returned;
        });
    }, [allSales, dateRange]);

    // Aggregate performance per staff
    const staffPerformance = useMemo(() => {
        const stats: Record<string, { staffId: string; staffName: string; role: string; count: number; totalRevenue: number; totalDiscount: number }> = {};

        filteredSales.forEach(s => {
            const staffId = s.staff_id || 'owner_default';
            const staffInfo = staffMap[staffId] || { id: staffId, name: 'Owner / General Cashier', role: 'Staff' };

            if (!stats[staffId]) {
                stats[staffId] = {
                    staffId: staffId,
                    staffName: staffInfo.name,
                    role: staffInfo.role,
                    count: 0,
                    totalRevenue: 0,
                    totalDiscount: 0
                };
            }

            stats[staffId].count += 1;
            stats[staffId].totalRevenue += Number(s.total || 0);
            stats[staffId].totalDiscount += Number(s.discount_amount || 0);
        });

        return Object.values(stats).sort((a, b) => b.totalRevenue - a.totalRevenue);
    }, [filteredSales, staffMap]);

    // Overall summary metrics
    const metrics = useMemo(() => {
        const totalSales = staffPerformance.reduce((sum, s) => sum + s.totalRevenue, 0);
        const topStaff = staffPerformance[0]?.staffName || 'N/A';
        const activeStaffCount = staffPerformance.length;
        return { totalSales, topStaff, activeStaffCount };
    }, [staffPerformance]);

    // Selected staff detailed sales breakdown
    const selectedStaffDetails = useMemo(() => {
        if (!selectedStaffId) return null;

        const staffInfo = staffMap[selectedStaffId] || { id: selectedStaffId, name: 'Selected Staff', role: 'Staff' };

        // Sales by this staff in selected date range
        const staffSales = filteredSales.filter(s => (s.staff_id || 'owner_default') === selectedStaffId);

        const totalRevenue = staffSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
        const totalDiscount = staffSales.reduce((sum, s) => sum + Number(s.discount_amount || 0), 0);
        const memoCount = staffSales.length;
        const avgTicket = memoCount > 0 ? totalRevenue / memoCount : 0;

        // Breakdown by date periods for quick comparison (Today, Yesterday, This Week, This Month)
        const getSalesForPeriod = (periodKey: string) => {
            const { start, end } = getDateBounds(periodKey);
            return allSales.filter(s => {
                const sd = new Date(s.sale_date || s.created_at);
                const isStaffMatch = (s.staff_id || 'owner_default') === selectedStaffId;
                return isStaffMatch && sd >= start && sd <= end && !s.is_returned;
            });
        };

        const todaySales = getSalesForPeriod('today');
        const yesterdaySales = getSalesForPeriod('yesterday');
        const thisWeekSales = getSalesForPeriod('this_week');
        const thisMonthSales = getSalesForPeriod('this_month');

        const periodStats = {
            today: { count: todaySales.length, total: todaySales.reduce((sum, s) => sum + Number(s.total || 0), 0) },
            yesterday: { count: yesterdaySales.length, total: yesterdaySales.reduce((sum, s) => sum + Number(s.total || 0), 0) },
            thisWeek: { count: thisWeekSales.length, total: thisWeekSales.reduce((sum, s) => sum + Number(s.total || 0), 0) },
            thisMonth: { count: thisMonthSales.length, total: thisMonthSales.reduce((sum, s) => sum + Number(s.total || 0), 0) }
        };

        return {
            staffInfo,
            sales: staffSales,
            totalRevenue,
            totalDiscount,
            memoCount,
            avgTicket,
            periodStats
        };
    }, [selectedStaffId, filteredSales, allSales, staffMap]);

    const filteredStaffList = fullStaffList.filter(s => 
        s.name.toLowerCase().includes(searchStaff.toLowerCase()) || 
        s.role.toLowerCase().includes(searchStaff.toLowerCase())
    );

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
        <div style={{padding: '2rem', maxWidth: '1100px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            {/* Header / Navigation */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => selectedStaffId ? setSelectedStaffId(null) : router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 style={{margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <Users size={24} color="var(--primary)" />
                            {selectedStaffId && selectedStaffDetails ? `${selectedStaffDetails.staffInfo.name} - বিক্রয় বিবরণ` : 'কর্মী বিক্রয় পারফরম্যান্স রিপোর্ট'}
                        </h1>
                        <p style={{margin: '0.2rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)'}}>
                            {selectedStaffId ? 'স্টাফের সময়ভিত্তিক বিক্রি এবং মোট লেনদেনের হিসেব' : 'সকল স্টাফ ও ক্যাশিয়ারের বিক্রির তুলনা ও রেকর্ড'}
                        </p>
                    </div>
                </div>

                <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
                    <select 
                        value={dateRange} 
                        onChange={(e) => setDateRange(e.target.value)}
                        style={{padding: '0.5rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', cursor: 'pointer', fontWeight: 500}}
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

            {/* IF A SPECIFIC STAFF IS SELECTED */}
            {selectedStaffId && selectedStaffDetails ? (
                <div>
                    {/* Selected Staff Top Profile Header */}
                    <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                            <div style={{width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-light, #eff6ff)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700}}>
                                {selectedStaffDetails.staffInfo.name.charAt(0)}
                            </div>
                            <div>
                                <h2 style={{margin: 0, fontSize: '1.3rem', color: 'var(--text-main)'}}>{selectedStaffDetails.staffInfo.name}</h2>
                                <span style={{display: 'inline-block', marginTop: '0.2rem', padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'var(--background)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)'}}>
                                    {selectedStaffDetails.staffInfo.role.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedStaffId(null)}
                            style={{padding: '0.4rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600}}
                        >
                            ← অন্য কর্মী বেছে নিন
                        </button>
                    </div>

                    {/* Period Quick Stats Cards */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem'}}>
                        <div style={{background: 'var(--surface)', padding: '1.1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <span style={{fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600}}>আজকের বিক্রি (Today)</span>
                            <h3 style={{margin: '0.4rem 0 0 0', fontSize: '1.3rem', color: 'var(--primary)'}}>৳ {selectedStaffDetails.periodStats.today.total.toFixed(2)}</h3>
                            <small style={{color: 'var(--text-muted)'}}>{selectedStaffDetails.periodStats.today.count} টি মেমো</small>
                        </div>

                        <div style={{background: 'var(--surface)', padding: '1.1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <span style={{fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600}}>গতকালের বিক্রি (Yesterday)</span>
                            <h3 style={{margin: '0.4rem 0 0 0', fontSize: '1.3rem', color: 'var(--text-main)'}}>৳ {selectedStaffDetails.periodStats.yesterday.total.toFixed(2)}</h3>
                            <small style={{color: 'var(--text-muted)'}}>{selectedStaffDetails.periodStats.yesterday.count} টি মেমো</small>
                        </div>

                        <div style={{background: 'var(--surface)', padding: '1.1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <span style={{fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600}}>এই সপ্তাহের বিক্রি (This Week)</span>
                            <h3 style={{margin: '0.4rem 0 0 0', fontSize: '1.3rem', color: '#10b981'}}>৳ {selectedStaffDetails.periodStats.thisWeek.total.toFixed(2)}</h3>
                            <small style={{color: 'var(--text-muted)'}}>{selectedStaffDetails.periodStats.thisWeek.count} টি মেমো</small>
                        </div>

                        <div style={{background: 'var(--surface)', padding: '1.1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <span style={{fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600}}>এই মাসের বিক্রি (This Month)</span>
                            <h3 style={{margin: '0.4rem 0 0 0', fontSize: '1.3rem', color: '#8b5cf6'}}>৳ {selectedStaffDetails.periodStats.thisMonth.total.toFixed(2)}</h3>
                            <small style={{color: 'var(--text-muted)'}}>{selectedStaffDetails.periodStats.thisMonth.count} টি মেমো</small>
                        </div>
                    </div>

                    {/* Detailed Metric Overview */}
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem'}}>
                        <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                                <ShoppingBag size={18} color="var(--primary)" /> নির্বাচিত সময়ের বিক্রি
                            </div>
                            <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {selectedStaffDetails.totalRevenue.toFixed(2)}</h2>
                        </div>

                        <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                                <UserCheck size={18} color="#10b981" /> সর্বমোট প্রসেসকৃত মেমো
                            </div>
                            <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>{selectedStaffDetails.memoCount} টি</h2>
                        </div>

                        <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                                <Percent size={18} color="#f59e0b" /> মোট দেওয়া ডিসকাউন্ট
                            </div>
                            <h2 style={{margin: 0, fontSize: '1.8rem', color: '#f59e0b'}}>৳ {selectedStaffDetails.totalDiscount.toFixed(2)}</h2>
                        </div>

                        <div style={{background: 'var(--surface)', padding: '1.25rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}>
                            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                                <Banknote size={18} color="#8b5cf6" /> গড় মেমো ভ্যালু (Average)
                            </div>
                            <h2 style={{margin: 0, fontSize: '1.8rem', color: 'var(--text-main)'}}>৳ {selectedStaffDetails.avgTicket.toFixed(2)}</h2>
                        </div>
                    </div>

                    {/* Invoices List Table for Selected Staff */}
                    <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                        <div style={{padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <h3 style={{margin: 0, fontSize: '1.1rem'}}>{selectedStaffDetails.staffInfo.name}-এর মেমো তালিকা ({selectedStaffDetails.sales.length} টি)</h3>
                        </div>

                        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                            <thead>
                                <tr style={{background: 'var(--background)', color: 'var(--text-muted)'}}>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Invoice No</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>তারিখ ও সময়</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>ছাড়/ডিসকাউন্ট</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>মোট বিল (৳)</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>স্ট্যাটাস</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedStaffDetails.sales.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                            নির্দিষ্ট সময়ের মধ্যে এই কর্মীর কোনো বিক্রয় রেকর্ড পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                ) : (
                                    selectedStaffDetails.sales.map((sale, i) => (
                                        <tr key={i} style={{borderBottom: '1px solid var(--border)'}}>
                                            <td style={{padding: '1rem', fontWeight: 600, color: 'var(--primary)'}}>
                                                {sale.invoice_no || sale.id.slice(0,8)}
                                            </td>
                                            <td style={{padding: '1rem', color: 'var(--text-muted)'}}>
                                                {new Date(sale.sale_date || sale.created_at).toLocaleString()}
                                            </td>
                                            <td style={{padding: '1rem', textAlign: 'center', color: 'var(--text-muted)'}}>
                                                ৳ {Number(sale.discount_amount || 0).toFixed(0)}
                                            </td>
                                            <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: 'var(--text-main)'}}>
                                                ৳ {Number(sale.total || 0).toFixed(2)}
                                            </td>
                                            <td style={{padding: '1rem', textAlign: 'center'}}>
                                                <span style={{
                                                    padding: '0.2rem 0.6rem',
                                                    borderRadius: '12px',
                                                    fontSize: '0.82rem',
                                                    fontWeight: 600,
                                                    background: sale.payment_status === 'paid' ? '#dcfce7' : (sale.payment_status === 'partial' ? '#fef3c7' : '#fee2e2'),
                                                    color: sale.payment_status === 'paid' ? '#166534' : (sale.payment_status === 'partial' ? '#92400e' : '#991b1b')
                                                }}>
                                                    {(sale.payment_status || 'paid').toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                /* MAIN OVERVIEW & STAFF SELECTION LIST */
                <div>
                    {/* Metrics Top */}
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

                    {/* Staff Sales Comparison Chart */}
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

                    {/* Staff List Cards / Table for Clicking */}
                    <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden'}}>
                        <div style={{padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
                            <div>
                                <h3 style={{margin: 0, fontSize: '1.1rem'}}>কর্মী তালিকা ও বিক্রয় বিবরণ (Sales by Staff)</h3>
                                <p style={{margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)'}}>ডিটেইলস দেখতে যেকোনো কর্মীর নামের ওপর ক্লিক করুন</p>
                            </div>
                            <div style={{position: 'relative'}}>
                                <Search size={16} style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
                                <input 
                                    type="text" 
                                    placeholder="কর্মী খুঁজুন..." 
                                    value={searchStaff}
                                    onChange={(e) => setSearchStaff(e.target.value)}
                                    style={{padding: '0.45rem 0.8rem 0.45rem 2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--text-main)', fontSize: '0.88rem'}}
                                />
                            </div>
                        </div>

                        <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                            <thead>
                                <tr style={{background: 'var(--background)', color: 'var(--text-muted)'}}>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Staff Name (কর্মীর নাম)</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)'}}>Role</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>Invoices Processed</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right'}}>Total Sales (৳)</th>
                                    <th style={{padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'center'}}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStaffList.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)'}}>
                                            কোনো কর্মী পাওয়া যায়নি।
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStaffList.map((st, i) => {
                                        const perf = staffPerformance.find(p => p.staffId === st.id);
                                        const count = perf?.count || 0;
                                        const revenue = perf?.totalRevenue || 0;

                                        return (
                                            <tr 
                                                key={st.id || i} 
                                                onClick={() => setSelectedStaffId(st.id)}
                                                style={{borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.15s'}}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--background)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{padding: '1rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                                                    <div style={{width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light, #eff6ff)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem'}}>
                                                        {st.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div>{st.name}</div>
                                                        {st.phone && <small style={{color: 'var(--text-muted)', fontSize: '0.78rem'}}>{st.phone}</small>}
                                                    </div>
                                                </td>
                                                <td style={{padding: '1rem', color: 'var(--text-muted)'}}>
                                                    <span style={{padding: '0.2rem 0.5rem', borderRadius: '8px', background: 'var(--background)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)'}}>
                                                        {st.role.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{count} টি মেমো</td>
                                                <td style={{padding: '1rem', textAlign: 'right', fontWeight: 700, color: '#10b981'}}>
                                                    ৳ {revenue.toFixed(2)}
                                                </td>
                                                <td style={{padding: '1rem', textAlign: 'center'}}>
                                                    <button style={{padding: '0.4rem 0.8rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer'}}>
                                                        বিবরণ দেখুন <ChevronRight size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
