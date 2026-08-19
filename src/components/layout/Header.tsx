'use client'

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
    Bell, Search, LogOut, RefreshCw, AlertTriangle, Package, User as UserIcon, FileText, X, Menu,
    Home, ShoppingCart, QrCode, FolderTree, Archive, TruckIcon, Users, Truck, Wallet, BarChart2,
    FileBarChart, MonitorSmartphone, UsersRound, Gift, HelpCircle, Settings
} from 'lucide-react';
import styles from './layout.module.css';
import { supabase } from '@/lib/supabase/client';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { fullSync } from '@/lib/sync';
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

export default function Header() {
    const { storeId, role, profile, signOut, hasPermission } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchPopover, setShowSearchPopover] = useState(false);
    const [showNotifPopover, setShowNotifPopover] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Live queries
    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];
    const products = useLiveQuery(() => localDB.products.toArray(), []) || [];
    const variants = useLiveQuery(() => localDB.productVariants.toArray(), []) || [];
    const customers = useLiveQuery(() => localDB.customers.toArray(), []) || [];
    const sales = useLiveQuery(() => localDB.sales.toArray(), []) || [];

    const bizSetting = settings.find(s => s.setting_key === 'business_info');
    const storeName = bizSetting?.setting_value?.name || 'My Store';

    const filteredNavItems = navItems.filter(item => {
        if (!item.perm) return true;
        return hasPermission(item.perm as any);
    });

    // Filter low stock items considering variant stocks
    const lowStockItems = products.filter(p => p.is_active).map(p => {
        let currentStock = p.stock || 0;
        if (p.has_variants) {
            const pVars = variants.filter(v => v.product_id === p.id);
            currentStock = pVars.reduce((sum, v) => sum + (v.stock || 0), 0);
        }
        return { ...p, calculatedStock: currentStock };
    }).filter(p => p.calculatedStock <= (p.low_stock_alert || 0));

    // Close popovers on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearchPopover(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifPopover(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter search results
    const trimmedQ = searchQuery.trim().toLowerCase();
    const matchedProducts = trimmedQ
        ? products.filter(p => p.name.toLowerCase().includes(trimmedQ) || (p.sku && p.sku.toLowerCase().includes(trimmedQ))).slice(0, 4)
        : [];
    const matchedCustomers = trimmedQ
        ? customers.filter(c => c.name.toLowerCase().includes(trimmedQ) || (c.phone && c.phone.includes(trimmedQ))).slice(0, 3)
        : [];
    const matchedSales = trimmedQ
        ? sales.filter(s => s.invoice_no.toLowerCase().includes(trimmedQ)).slice(0, 3)
        : [];

    const hasSearchResults = matchedProducts.length > 0 || matchedCustomers.length > 0 || matchedSales.length > 0;

    const handleSync = async () => {
        if (!storeId) {
            alert('Store ID not available yet.');
            return;
        }
        setIsSyncing(true);
        try {
            await fullSync(storeId);
            alert('Sync completed successfully!');
        } catch (err: any) {
            console.error('Sync failed:', err);
            alert('Sync error: ' + (err.message || 'Unknown error'));
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <>
            <header className={styles.header}>
                {/* Search Input & Popover */}
                <div className={styles.search} ref={searchRef}>
                    <Search size={20} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search products, customers, invoices..." 
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSearchPopover(true);
                        }}
                        onFocus={() => setShowSearchPopover(true)}
                        style={{ paddingRight: searchQuery ? '2.2rem' : '1rem' }}
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => {
                                setSearchQuery('');
                                setShowSearchPopover(false);
                            }}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '2px'
                            }}
                            title="Clear search"
                        >
                            <X size={16} />
                        </button>
                    )}
                    
                    {showSearchPopover && trimmedQ.length > 0 && (
                        <div className={`${styles.popover} ${styles.searchPopover}`}>
                            <div className={styles.popoverHeader}>
                                <span>Search Results</span>
                                <button onClick={() => setShowSearchPopover(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                    <X size={16} />
                                </button>
                            </div>

                            {!hasSearchResults && (
                                <p style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>No results found for "{searchQuery}"</p>
                            )}

                            {matchedProducts.length > 0 && (
                                <div>
                                    <div className={styles.popoverGroupTitle}>Products</div>
                                    {matchedProducts.map(p => (
                                        <Link key={p.id} href={`/products`} onClick={() => setShowSearchPopover(false)} className={styles.popoverItem}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <Package size={16} color="var(--primary)" />
                                                <span>{p.name}</span>
                                            </div>
                                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>৳ {p.selling_price}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {matchedCustomers.length > 0 && (
                                <div>
                                    <div className={styles.popoverGroupTitle}>Customers</div>
                                    {matchedCustomers.map(c => (
                                        <Link key={c.id} href={`/customers`} onClick={() => setShowSearchPopover(false)} className={styles.popoverItem}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <UserIcon size={16} color="#10b981" />
                                                <span>{c.name}</span>
                                            </div>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            {matchedSales.length > 0 && (
                                <div>
                                    <div className={styles.popoverGroupTitle}>Invoices</div>
                                    {matchedSales.map(s => (
                                        <Link key={s.id} href={`/sales`} onClick={() => setShowSearchPopover(false)} className={styles.popoverItem}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <FileText size={16} color="#f59e0b" />
                                                <span>{s.invoice_no}</span>
                                            </div>
                                            <span style={{ fontWeight: 600 }}>৳ {s.total}</span>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                    {/* Cloud Sync Button */}
                    <button 
                        className={styles.iconButton} 
                        onClick={handleSync} 
                        disabled={isSyncing} 
                        title="Force Cloud Sync"
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <RefreshCw size={19} className={isSyncing ? styles.spin : ''} color={isSyncing ? 'var(--primary)' : 'var(--text-muted)'} />
                    </button>

                    {/* Notifications Bell */}
                    <div style={{ position: 'relative' }} ref={notifRef}>
                        <button 
                            className={styles.iconButton} 
                            onClick={() => setShowNotifPopover(!showNotifPopover)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                            title="Low Stock Alerts"
                        >
                            <Bell size={20} />
                            {lowStockItems.length > 0 && (
                                <span className={styles.badge}>{lowStockItems.length}</span>
                            )}
                        </button>

                        {showNotifPopover && (
                            <div className={`${styles.popover} ${styles.notificationPopover}`}>
                                <div className={styles.popoverHeader}>
                                    <span>Low Stock Notifications</span>
                                    <span style={{ fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {lowStockItems.length} items
                                    </span>
                                </div>

                                {lowStockItems.length === 0 ? (
                                    <p style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>All items are sufficiently stocked! 👍</p>
                                ) : (
                                    <div>
                                        {lowStockItems.slice(0, 5).map(item => (
                                            <div key={item.id} className={styles.popoverItem} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <AlertTriangle size={16} color="#f59e0b" />
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>Only {item.calculatedStock} left in stock</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <Link 
                                            href="/inventory" 
                                            onClick={() => setShowNotifPopover(false)}
                                            style={{ display: 'block', textAlign: 'center', padding: '0.5rem', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.25rem' }}
                                        >
                                            View Inventory & Restock →
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Dynamic Store Name */}
                    <div className={styles.storeSelect} title="Active Store Name">
                        <span>🏬 {storeName}</span>
                    </div>

                    {/* Logout Button */}
                    <button onClick={handleLogout} className={styles.iconButton} title="Logout" style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <LogOut size={20} />
                    </button>

                    {/* Mobile Menu / Close Toggle Button (Far Right of Top Bar) */}
                    <button 
                        className={`${styles.mobileMenuBtn} ${isMobileMenuOpen ? styles.mobileMenuBtnActive : ''}`}
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                        title={isMobileMenuOpen ? "Close Menu" : "Open Menu"}
                    >
                        {isMobileMenuOpen ? <X size={22} color="var(--primary)" /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Mobile Right Sidebar Drawer */}
            {isMobileMenuOpen && (
                <>
                    <div className={styles.mobileDrawerOverlay} onClick={() => setIsMobileMenuOpen(false)} />
                    <aside className={styles.mobileRightDrawer}>
                        <div className={styles.mobileDrawerHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <div className={styles.mobileStoreBadge}>🏬</div>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.2 }}>{storeName}</div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>QRPOS Navigation</div>
                                </div>
                            </div>
                            <button 
                                className={styles.mobileCloseBtn}
                                onClick={() => setIsMobileMenuOpen(false)}
                                title="Close Menu"
                            >
                                <X size={22} color="var(--primary)" />
                            </button>
                        </div>

                        <nav className={styles.mobileDrawerNav}>
                            {filteredNavItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;
                                return (
                                    <Link 
                                        key={item.href} 
                                        href={item.href} 
                                        className={`${styles.mobileNavItem} ${isActive ? styles.activeMobileNavItem : ''}`}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <Icon size={19} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className={styles.mobileUserFooter}>
                            <div className={styles.avatar}>{profile?.name ? profile.name[0].toUpperCase() : 'U'}</div>
                            <div className={styles.userInfo}>
                                <p className={styles.userName}>{profile?.name || 'User'}</p>
                                <p className={styles.userRole} style={{ textTransform: 'capitalize' }}>{role || 'Staff'}</p>
                            </div>
                            <button onClick={handleLogout} className={styles.logoutBtn} title="Sign Out">
                                <LogOut size={18} />
                            </button>
                        </div>
                    </aside>
                </>
            )}
        </>
    );
}
