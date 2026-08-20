'use client'

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, ShoppingCart, FileBarChart, Menu, X, Users, Truck, Settings, QrCode, FolderTree, Archive, Wallet, MonitorSmartphone, UsersRound, Gift, HelpCircle, TruckIcon } from 'lucide-react';
import styles from './bottomNav.module.css';
import { useAuth } from '@/lib/contexts/AuthContext';

const mainNavItems = [
    { label: 'Home', href: '/', icon: Home, perm: null },
    { label: 'Products', href: '/products', icon: Package, perm: null },
    { label: 'POS', href: '/pos', icon: ShoppingCart, perm: null },
    { label: 'Reports', href: '/reports', icon: FileBarChart, perm: 'can_view_reports' },
];

const allOtherItems = [
    { label: 'QR Labels', href: '/qr', icon: QrCode, perm: 'can_manage_qr' },
    { label: 'Categories', href: '/categories', icon: FolderTree, perm: 'can_manage_categories' },
    { label: 'Inventory', href: '/inventory', icon: Archive, perm: 'can_manage_inventory' },
    { label: 'Purchases', href: '/purchases', icon: TruckIcon, perm: 'can_manage_purchases' },
    { label: 'Sales', href: '/sales', icon: FileBarChart, perm: null },
    { label: 'Customers', href: '/customers', icon: Users, perm: null },
    { label: 'Suppliers', href: '/suppliers', icon: Truck, perm: 'can_manage_suppliers' },
    { label: 'Expenses', href: '/expenses', icon: Wallet, perm: 'can_manage_expenses' },
    { label: 'QR Menu', href: '/qr-menu', icon: MonitorSmartphone, perm: 'can_manage_qr' },
    { label: 'HR & Staff', href: '/staff', icon: UsersRound, perm: 'can_manage_staff' },
    { label: 'Support', href: '/support', icon: HelpCircle, perm: null },
    { label: 'Settings', href: '/settings', icon: Settings, perm: 'can_manage_settings' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { role, hasPermission } = useAuth();

    const filteredMainItems = mainNavItems.filter(item => {
        if (!item.perm) return true;
        return hasPermission(item.perm as any);
    });

    const filteredOtherItems = allOtherItems.filter(item => {
        if (!item.perm) return true;
        return hasPermission(item.perm as any);
    });

    return (
        <>
            <nav className={styles.bottomNav}>
                {filteredMainItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
                            <Icon size={20} />
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
                <button className={`${styles.navItem} ${drawerOpen ? styles.active : ''}`} onClick={() => setDrawerOpen(true)}>
                    <Menu size={20} />
                    <span>More</span>
                </button>
            </nav>

            {/* More Drawer Overlay */}
            {drawerOpen && (
                <div className={styles.overlay} onClick={() => setDrawerOpen(false)}>
                    <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.drawerHeader}>
                            <h2>Menu</h2>
                            <button onClick={() => setDrawerOpen(false)} className={styles.closeBtn}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.drawerGrid}>
                            {filteredOtherItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link 
                                        key={item.href} 
                                        href={item.href} 
                                        className={`${styles.drawerItem} ${isActive ? styles.activeItem : ''}`}
                                        onClick={() => setDrawerOpen(false)}
                                    >
                                        <Icon size={20} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
