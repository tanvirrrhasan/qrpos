'use client'

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
    BarChart3, 
    PieChart, 
    PackageSearch, 
    Tags, 
    ClipboardList, 
    CreditCard, 
    Receipt, 
    Users, 
    WalletCards, 
    CalendarCheck, 
    ShoppingCart 
} from 'lucide-react';
import styles from '../products/products.module.css';

const REPORTS = [
    { title: 'বিক্রি রিপোর্ট (Sales)', icon: <BarChart3 size={24} />, path: '/reports/sales', desc: 'Period-wise sales summary & trends' },
    { title: 'লাভ-ক্ষতি (Profit/Loss)', icon: <PieChart size={24} />, path: '/reports/profit-loss', desc: 'Revenue vs Costs vs Expenses' },
    { title: 'দৈনিক সারসংক্ষেপ (Daily)', icon: <CalendarCheck size={24} />, path: '/reports/daily', desc: 'End-of-day business summary' },
    { title: 'স্টক রিপোর্ট (Stock)', icon: <ClipboardList size={24} />, path: '/reports/stock', desc: 'Current stock status & value' },
    { title: 'বাকি রিপোর্ট (Due)', icon: <CreditCard size={24} />, path: '/reports/due', desc: 'Customer dues & aging breakdown' },
    
    // Additional placeholders from the plan:
    { title: 'পণ্য-ভিত্তিক বিক্রি', icon: <PackageSearch size={24} />, path: '/reports/products', desc: 'Top/least selling products' },
    { title: 'ক্যাটেগরি-ভিত্তিক বিক্রি', icon: <Tags size={24} />, path: '/reports/categories', desc: 'Sales by category' },
    { title: 'খরচ রিপোর্ট', icon: <Receipt size={24} />, path: '/reports/expenses', desc: 'Expense breakdown' },
    { title: 'কর্মী রিপোর্ট', icon: <Users size={24} />, path: '/reports/staff', desc: 'Staff-wise performance' },
    { title: 'পেমেন্ট রিপোর্ট', icon: <WalletCards size={24} />, path: '/reports/payments', desc: 'Payment method breakdown' },
    { title: 'ক্রয় রিপোর্ট', icon: <ShoppingCart size={24} />, path: '/reports/purchases', desc: 'Purchase history summary' },
];

import { useAuth } from '@/lib/contexts/AuthContext';

export default function ReportsHubPage() {
    const { hasPermission } = useAuth();
    const router = useRouter();

    if (!hasPermission('can_view_reports')) {
        return (
            <div className={styles.productsPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view reports.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productsPage}>
            <div className={styles.header}>
                <h1>Reports & Analytics</h1>
            </div>

            <div style={{
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                gap: '1.5rem', 
                paddingTop: '1rem'
            }}>
                {REPORTS.map((report, idx) => (
                    <div 
                        key={idx} 
                        onClick={() => router.push(report.path)}
                        style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: '1.5rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'var(--primary)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.transform = 'none';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                        }}
                    >
                        <div style={{
                            background: 'var(--background)', 
                            padding: '1rem', 
                            borderRadius: '12px', 
                            color: 'var(--primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            {report.icon}
                        </div>
                        <div>
                            <h3 style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem'}}>{report.title}</h3>
                            <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.4}}>
                                {report.desc}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
