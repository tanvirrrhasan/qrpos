import Link from 'next/link';
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

    const filteredNavItems = navItems.filter(item => {
        if (!item.perm) return true;
        return hasPermission(item.perm as any);
    });

    return (
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
                <div className={styles.avatar}>{profile?.name ? profile.name[0].toUpperCase() : 'U'}</div>
                <div className={styles.userInfo}>
                    <p className={styles.userName}>{profile?.name || 'Loading...'}</p>
                    <p className={styles.userRole} style={{ textTransform: 'capitalize' }}>{role || 'User'}</p>
                </div>
                <button onClick={signOut} className={styles.logoutBtn} title="Sign Out">
                    <LogOut size={18} />
                </button>
            </div>
        </aside>
    );
}
