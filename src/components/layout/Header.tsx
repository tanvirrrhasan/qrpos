'use client'

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, Search, LogOut, RefreshCw, AlertTriangle, Package, User as UserIcon, FileText, X } from 'lucide-react';
import styles from './layout.module.css';
import { supabase } from '@/lib/supabase/client';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { fullSync } from '@/lib/sync';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function Header() {
    const { storeId } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchPopover, setShowSearchPopover] = useState(false);
    const [showNotifPopover, setShowNotifPopover] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

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
            </div>
        </header>
    );
}

