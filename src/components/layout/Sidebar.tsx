'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Package, ShoppingCart, Users, Truck, FileText, Settings, BarChart2, QrCode, FolderTree, Archive, Wallet, FileBarChart, MonitorSmartphone, UsersRound, Gift, HelpCircle, TruckIcon, LogOut } from 'lucide-react';
import styles from './layout.module.css';
import { useAuth } from '@/lib/contexts/AuthContext';

const navItems = [
    { label: 'Dashboard', href: '/', icon: Home, perm: null },
    { label: 'POS', href: '/pos', icon: ShoppingCart, perm: null },
    { label: 'Products', href: '/products', icon: Package, perm: null },
    { label: 'QR Labels', href: '/qr', icon: QrCode, perm: 'can_manage_qr' },
    { label: 'Categories', href: '/categories', icon: FolderTree, perm: 'can_manage_categories' },
    { label: 'Inventory', href: '/inventory', icon: Archive, perm: 'can_manage_inventory' },
    { label: 'Purchases', href: '/purchases', icon: TruckIcon, perm: 'can_manage_purchases' },
    { label: 'Sales', href: '/sales', icon: FileText, perm: null },
    { label: 'Customers', href: '/customers', icon: Users, perm: null },
    { label: 'Suppliers', href: '/suppliers', icon: Truck, perm: 'can_manage_suppliers' },
    { label: 'Register', href: '/register', icon: Wallet, perm: null },
    { label: 'Accounts', href: '/accounts', icon: BarChart2, perm: 'can_view_reports' },
    { label: 'Expenses', href: '/expenses', icon: Wallet, perm: 'can_manage_expenses' },
    { label: 'Reports', href: '/reports', icon: FileBarChart, perm: 'can_view_reports' },
    { label: 'QR Menu', href: '/qr-menu', icon: MonitorSmartphone, perm: 'can_manage_qr' },
    { label: 'HR & Staff', href: '/staff', icon: UsersRound, perm: 'can_manage_staff' },
    { label: 'Offers', href: '/offers', icon: Gift, perm: 'can_manage_settings' },
    { label: 'Support', href: '/support', icon: HelpCircle, perm: null },
    { label: 'Settings', href: '/settings', icon: Settings, perm: 'can_manage_settings' },
];

export default function Sidebar() {
    const { role, profile, signOut, hasPermission } = useAuth();
    const router = useRouter();
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const filteredNavItems = navItems.filter(item => {
        if (!item.perm) return true;
        return hasPermission(item.perm as any);
    });

    const handleConfirmLogout = async () => {
        setShowLogoutModal(false);
        await signOut();
        router.push('/login');
    };

    return (
        <>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <h2>QRPOS</h2>
                </div>
                <nav className={styles.nav}>
                    {filteredNavItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.href} href={item.href} className={styles.navItem}>
                                <Icon size={20} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className={styles.userProfile}>
                    <Link href="/profile" className={styles.profileLink} title="View & Edit Profile">
                        <div className={styles.avatar}>{profile?.name ? profile.name[0].toUpperCase() : 'U'}</div>
                        <div className={styles.userInfo}>
                            <p className={styles.userName}>{profile?.name || 'Loading...'}</p>
                            <p className={styles.userRole} style={{ textTransform: 'capitalize' }}>{role || 'User'}</p>
                        </div>
                    </Link>
                    <button onClick={() => setShowLogoutModal(true)} className={styles.logoutBtn} title="Sign Out">
                        <LogOut size={18} />
                    </button>
                </div>
            </aside>

            {/* Logout Confirmation Modal */}
            {showLogoutModal && (
                <div style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.65)', zIndex: 3000, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', width: '100%', maxWidth: '360px', padding: '1.5rem', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                            <LogOut size={26} />
                        </div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text-main)' }}>Confirm Logout</h3>
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0', lineHeight: 1.4 }}>Are you sure you want to log out of your session?</p>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <button 
                                onClick={() => setShowLogoutModal(false)}
                                style={{ padding: '0.7rem', background: 'var(--background)', color: 'var(--text-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirmLogout}
                                style={{ padding: '0.7rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Yes, Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
