'use client'

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { ArrowLeft, Printer } from 'lucide-react';

export default function DailySummaryPage() {
    const router = useRouter();
    const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

    const allSales = useLiveQuery(() => localDB.sales.toArray()) || [];
    const allSalePayments = useLiveQuery(() => localDB.salePayments.toArray()) || [];
    const allDuePayments = useLiveQuery(() => localDB.duePayments.toArray()) || [];
    const allPurchases = useLiveQuery(() => localDB.purchases.toArray()) || [];
    const allSupplierPayments = useLiveQuery(() => localDB.supplierPayments.toArray()) || [];
    const allExpenses = useLiveQuery(() => localDB.expenses.toArray()) || [];

    const summary = useMemo(() => {
        // Sales Filter
        const salesToday = allSales.filter(s => s.sale_date.startsWith(targetDate) && !s.is_returned);
        const saleIds = new Set(salesToday.map(s => s.id));
        const salePaymentsToday = allSalePayments.filter(sp => saleIds.has(sp.sale_id));
        
        // Due Payments Filter
        const duePaymentsToday = allDuePayments.filter(dp => dp.payment_date.startsWith(targetDate));

        // Purchases Filter
        const purchasesToday = allPurchases.filter(p => p.purchase_date.startsWith(targetDate));
        const supplierPaymentsToday = allSupplierPayments.filter(sp => sp.payment_date.startsWith(targetDate));

        // Expenses Filter
        const expensesToday = allExpenses.filter(e => e.expense_date.startsWith(targetDate));

        // --- Calculate Values ---
        const totalSales = salesToday.reduce((sum, s) => sum + s.total, 0);
        const transactionCount = salesToday.length;
        
        let cashSales = 0;
        let bkashSales = 0;
        let otherSales = 0;
        salePaymentsToday.forEach(sp => {
            if (sp.payment_method === 'cash') cashSales += sp.amount;
            else if (sp.payment_method === 'bkash') bkashSales += sp.amount;
            else otherSales += sp.amount;
        });
        const dueSales = salesToday.reduce((sum, s) => sum + s.due_amount, 0);

        const totalPurchases = purchasesToday.reduce((sum, p) => sum + p.total, 0);
        const cashPurchases = supplierPaymentsToday.reduce((sum, sp) => sum + sp.amount, 0);

        const totalExpenses = expensesToday.reduce((sum, e) => sum + e.amount, 0);

        const dueCollections = duePaymentsToday.reduce((sum, dp) => sum + dp.amount, 0);

        // Cash Summary
        const cashInflow = cashSales + bkashSales + otherSales + dueCollections;
        const cashOutflow = cashPurchases + totalExpenses;
        const netCashFlow = cashInflow - cashOutflow;

        return {
            totalSales, transactionCount, cashSales, bkashSales, otherSales, dueSales,
            totalPurchases, cashPurchases,
            totalExpenses,
            dueCollections,
            cashInflow, cashOutflow, netCashFlow
        };
    }, [allSales, allSalePayments, allDuePayments, allPurchases, allSupplierPayments, allExpenses, targetDate]);

    return (
        <div style={{padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace', fontSize: '1rem', background: '#f8fafc', minHeight: '100vh'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', fontFamily: 'system-ui, sans-serif'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <button onClick={() => router.back()} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}>
                        <ArrowLeft size={20} />
                    </button>
                    <h1 style={{margin: 0, fontSize: '1.5rem'}}>Daily Summary</h1>
                </div>
                <div style={{display: 'flex', gap: '1rem'}}>
                    <input 
                        type="date" 
                        value={targetDate} 
                        onChange={e => setTargetDate(e.target.value)} 
                        style={{padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--surface)'}}
                    />
                    <button onClick={() => window.print()} style={{padding: '0.5rem 1rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                        <Printer size={16} /> Print
                    </button>
                </div>
            </div>

            <div style={{background: '#fff', padding: '3rem', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0'}}>
                <div style={{textAlign: 'center', marginBottom: '2rem'}}>
                    <h2 style={{margin: '0 0 0.5rem 0', fontSize: '1.5rem'}}>দৈনিক সারসংক্ষেপ (Daily Summary)</h2>
                    <p style={{margin: 0, color: '#64748b'}}>তারিখ: {new Date(targetDate).toLocaleDateString()}</p>
                    <div style={{borderBottom: '2px dashed #cbd5e1', margin: '1rem 0'}}></div>
                </div>

                <div style={{marginBottom: '2rem'}}>
                    <h3 style={{fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155'}}>বিক্রি (Sales):</h3>
                    <div style={{paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>মোট বিক্রি:</span> <strong>৳ {summary.totalSales.toFixed(2)}</strong></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>নগদ বিক্রি:</span> <span>৳ {summary.cashSales.toFixed(2)}</span></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>bKash/Other:</span> <span>৳ {(summary.bkashSales + summary.otherSales).toFixed(2)}</span></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>বাকি বিক্রি:</span> <span>৳ {summary.dueSales.toFixed(2)}</span></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>Transaction:</span> <span>{summary.transactionCount} টি</span></div>
                    </div>
                </div>

                <div style={{marginBottom: '2rem'}}>
                    <h3 style={{fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155'}}>ক্রয় (Purchases):</h3>
                    <div style={{paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>মোট ক্রয়:</span> <strong>৳ {summary.totalPurchases.toFixed(2)}</strong></div>
                    </div>
                </div>

                <div style={{marginBottom: '2rem'}}>
                    <h3 style={{fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155'}}>খরচ (Expenses):</h3>
                    <div style={{paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>আজকের খরচ:</span> <strong>৳ {summary.totalExpenses.toFixed(2)}</strong></div>
                    </div>
                </div>

                <div style={{marginBottom: '2rem'}}>
                    <h3 style={{fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155'}}>বাকি (Due):</h3>
                    <div style={{paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>নতুন বাকি (Sales Due):</span> <span>৳ {summary.dueSales.toFixed(2)}</span></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px'}}><span>বাকি আদায় (Collection):</span> <strong>৳ {summary.dueCollections.toFixed(2)}</strong></div>
                    </div>
                </div>

                <div style={{borderTop: '2px dashed #cbd5e1', paddingTop: '2rem'}}>
                    <h3 style={{fontSize: '1.1rem', margin: '0 0 1rem 0', color: '#334155'}}>ক্যাশ ফ্লো (Cash Flow Summary):</h3>
                    <div style={{paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px', color: '#16a34a'}}><span>+ পেমেন্ট রিসিভ:</span> <span>৳ {summary.cashInflow.toFixed(2)}</span></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px', color: '#dc2626'}}><span>- পেমেন্ট আউট:</span> <span>- ৳ {summary.cashOutflow.toFixed(2)}</span></div>
                        <div style={{borderBottom: '1px solid #cbd5e1', width: '300px', margin: '0.5rem 0'}}></div>
                        <div style={{display: 'flex', justifyContent: 'space-between', width: '300px', fontSize: '1.25rem', fontWeight: 'bold'}}>
                            <span>Net Cash Flow:</span> 
                            <span>৳ {summary.netCashFlow.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
