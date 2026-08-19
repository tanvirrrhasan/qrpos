'use client'

import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { fullSync } from '@/lib/sync';
import { Save, Store, Globe, Receipt, Calculator, QrCode, CreditCard, Package, ToggleLeft, Palette, Database, CloudSync } from 'lucide-react';
import styles from './settings.module.css';
import { v4 as uuidv4 } from 'uuid';

import { useAuth } from '@/lib/contexts/AuthContext';

export default function SettingsPage() {
    const { hasPermission } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('business');

    // Section 1: Business Information
    const [bizInfo, setBizInfo] = useState({ name: '', address: '', phone: '', email: '', logo: '' });
    // Section 2: Currency & Regional
    const [regional, setRegional] = useState({ symbol: '৳', code: 'BDT', timezone: 'Asia/Dhaka', dateFormat: 'DD/MM/YYYY' });
    // Section 3: Invoice / Receipt
    const [receipt, setReceipt] = useState({ prefix: 'INV-', showLogo: true, showCustomer: true, showCashier: true, showQR: false, footer: 'ধন্যবাদ! আবার আসবেন।', size: '80mm' });
    // Section 4: Tax / VAT
    const [tax, setTax] = useState({ enabled: false, name: 'VAT', rate: 0, type: 'Exclusive' });
    // Section 5: QR Code Config
    const [qrConfig, setQrConfig] = useState({ mode: 'Text Only', urlPattern: '', showName: true, showPrice: true, showSku: true, showStore: false, size: 'Medium' });
    // Section 6: Payment Methods
    const [payments, setPayments] = useState({ cash: true, bkash: true, nagad: true, rocket: false, bank: false, card: false });
    // Section 7: Inventory
    const [invSettings, setInvSettings] = useState({ lowStockAlert: 5, allowNegative: false, showOnPos: true });
    // Section 8: Feature Toggles
    const [features, setFeatures] = useState({ variants: false, subCategories: false, expense: true, suppliers: true, returns: true, staffLog: true, holdCart: true });
    // Section 9: Appearance
    const [appearance, setAppearance] = useState({ theme: 'Dark', primaryColor: '#3b82f6', language: 'বাংলা', posView: 'Grid' });

    const settings = useLiveQuery(() => localDB.settings.toArray(), []);

    useEffect(() => {
        async function fetchStore() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
        }
        fetchStore();
    }, []);

    useEffect(() => {
        if (settings && settings.length > 0) {
            const loadSetting = (key: string, setter: Function) => {
                const s = settings.find(x => x.setting_key === key);
                if (s?.setting_value) setter(s.setting_value);
            };
            loadSetting('business_info', setBizInfo);
            loadSetting('regional', setRegional);
            loadSetting('receipt', setReceipt);
            loadSetting('tax', setTax);
            loadSetting('qr_config', setQrConfig);
            loadSetting('payments', setPayments);
            loadSetting('inventory_settings', setInvSettings);
            loadSetting('features', setFeatures);
            loadSetting('appearance', setAppearance);
        }
    }, [settings]);

    const handleSave = async (key: string, value: any) => {
        if (!storeId) return alert('Store ID not loaded');
        setSaving(true);
        try {
            const payload: any = {
                store_id: storeId, 
                setting_key: key, 
                setting_value: value, 
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase.from('store_settings')
                .upsert(payload, { onConflict: 'store_id,setting_key' })
                .select()
                .single();

            if (error) throw error;
            
            if (data) {
                await localDB.settings.put(data);
                if (key === 'qr_config' && typeof value === 'object') {
                    for (const [subKey, subVal] of Object.entries(value)) {
                        await localDB.settings.put({
                            id: `qr_config.${subKey}`,
                            setting_key: `qr_config.${subKey}`,
                            setting_value: String(subVal),
                            updated_at: new Date().toISOString()
                        });
                    }
                }
            }

            // System Audit Activity Log
            const actPayload = {
                id: uuidv4(),
                store_id: storeId,
                staff_id: undefined,
                action: 'settings_updated',
                entity_type: 'settings',
                entity_id: key,
                details: { setting_key: key },
                created_at: new Date().toISOString()
            };
            await localDB.activityLog.put(actPayload);
            try {
                await supabase.from('activity_logs').insert([actPayload]);
            } catch (e) {}
            
            alert('Settings saved successfully!');
        } catch (error: any) {
            console.error(error);
            alert('Failed to save: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async () => {
        if (!storeId) return alert('Store ID not loaded');
        setIsSyncing(true);
        try {
            await fullSync(storeId);
            alert('Cloud Sync completed successfully! All data is up to date.');
        } catch (error: any) {
            console.error("Sync error:", error);
            alert('Sync failed: ' + error.message);
        } finally {
            setIsSyncing(false);
        }
    };

    const tabs = [
        { id: 'business', label: 'Business Info', icon: <Store size={16}/> },
        { id: 'regional', label: 'Regional', icon: <Globe size={16}/> },
        { id: 'receipt', label: 'Receipt', icon: <Receipt size={16}/> },
        { id: 'tax', label: 'Tax / VAT', icon: <Calculator size={16}/> },
        { id: 'qr', label: 'QR Code', icon: <QrCode size={16}/> },
        { id: 'payments', label: 'Payments', icon: <CreditCard size={16}/> },
        { id: 'inventory', label: 'Inventory', icon: <Package size={16}/> },
        { id: 'features', label: 'Features', icon: <ToggleLeft size={16}/> },
        { id: 'appearance', label: 'Appearance', icon: <Palette size={16}/> },
        { id: 'data', label: 'Data', icon: <Database size={16}/> },
    ];

    if (!hasPermission('can_manage_settings')) {
        return (
            <div className={styles.settingsPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view settings.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.settingsPage}>
            <div className={styles.header}>
                <h1>Settings & Configuration</h1>
            </div>

            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button 
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className={styles.grid}>
                {/* 1. Business Info */}
                {activeTab === 'business' && (
                    <div className={styles.card}>
                        <h2><Store size={20} /> 1. Business Information</h2>
                        <div className={styles.formGroup}>
                            <label>দোকানের নাম (Store Name)</label>
                            <input type="text" value={bizInfo.name} onChange={e => setBizInfo({...bizInfo, name: e.target.value})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>ঠিকানা (Address)</label>
                            <textarea value={bizInfo.address} onChange={e => setBizInfo({...bizInfo, address: e.target.value})} rows={3} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>ফোন (Phone)</label>
                            <input type="text" value={bizInfo.phone} onChange={e => setBizInfo({...bizInfo, phone: e.target.value})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>ইমেইল (Email)</label>
                            <input type="email" value={bizInfo.email} onChange={e => setBizInfo({...bizInfo, email: e.target.value})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>লোগো (Logo URL - Auto handled later)</label>
                            <input type="text" placeholder="https://..." value={bizInfo.logo} onChange={e => setBizInfo({...bizInfo, logo: e.target.value})} />
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('business_info', bizInfo)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 2. Currency & Regional */}
                {activeTab === 'regional' && (
                    <div className={styles.card}>
                        <h2><Globe size={20} /> 2. Currency & Regional</h2>
                        <div className={styles.formGroup}>
                            <label>Currency Symbol</label>
                            <input type="text" value={regional.symbol} onChange={e => setRegional({...regional, symbol: e.target.value})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Currency Code</label>
                            <input type="text" value={regional.code} onChange={e => setRegional({...regional, code: e.target.value})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Timezone</label>
                            <select value={regional.timezone} onChange={e => setRegional({...regional, timezone: e.target.value})}>
                                <option value="Asia/Dhaka">Asia/Dhaka</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Date Format</label>
                            <select value={regional.dateFormat} onChange={e => setRegional({...regional, dateFormat: e.target.value})}>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('regional', regional)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 3. Invoice / Receipt */}
                {activeTab === 'receipt' && (
                    <div className={styles.card}>
                        <h2><Receipt size={20} /> 3. Invoice / Receipt</h2>
                        <div className={styles.formGroup}>
                            <label>Invoice Prefix</label>
                            <input type="text" value={receipt.prefix} onChange={e => setReceipt({...receipt, prefix: e.target.value})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={receipt.showLogo} onChange={e => setReceipt({...receipt, showLogo: e.target.checked})} />
                                Show Logo on Receipt
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={receipt.showCustomer} onChange={e => setReceipt({...receipt, showCustomer: e.target.checked})} />
                                Show Customer on Receipt
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={receipt.showCashier} onChange={e => setReceipt({...receipt, showCashier: e.target.checked})} />
                                Show Cashier on Receipt
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={receipt.showQR} onChange={e => setReceipt({...receipt, showQR: e.target.checked})} />
                                Show QR on Receipt
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Receipt Footer Message</label>
                            <textarea value={receipt.footer} onChange={e => setReceipt({...receipt, footer: e.target.value})} rows={3} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Receipt Paper Size</label>
                            <select value={receipt.size} onChange={e => setReceipt({...receipt, size: e.target.value})}>
                                <option value="80mm Thermal">80mm Thermal</option>
                                <option value="58mm Thermal">58mm Thermal</option>
                                <option value="A4">A4</option>
                            </select>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('receipt', receipt)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 4. Tax / VAT */}
                {activeTab === 'tax' && (
                    <div className={styles.card}>
                        <h2><Calculator size={20} /> 4. Tax / VAT</h2>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={tax.enabled} onChange={e => setTax({...tax, enabled: e.target.checked})} />
                                Enable Tax
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Tax Name</label>
                            <input type="text" value={tax.name} onChange={e => setTax({...tax, name: e.target.value})} disabled={!tax.enabled} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Tax Rate (%)</label>
                            <input type="number" value={tax.rate} onChange={e => setTax({...tax, rate: Number(e.target.value)})} disabled={!tax.enabled} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Tax Type</label>
                            <select value={tax.type} onChange={e => setTax({...tax, type: e.target.value})} disabled={!tax.enabled}>
                                <option value="Exclusive">Exclusive</option>
                                <option value="Inclusive">Inclusive</option>
                            </select>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('tax', tax)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 5. QR Code Configuration */}
                {activeTab === 'qr' && (
                    <div className={styles.card}>
                        <h2><QrCode size={20} /> 5. QR Code Configuration</h2>
                        <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem'}}>
                            Set what internal data is encoded inside the 2D QR Code image when scanned with a phone or QR scanner.
                        </p>

                        <div className={styles.formGroup}>
                            <label>QR Code Internal Scan Data Mode</label>
                            <select value={qrConfig.mode} onChange={e => setQrConfig({...qrConfig, mode: e.target.value})}>
                                <option value="1">Mode 1: Text / SKU Only (e.g. QRPOS::SKU)</option>
                                <option value="2">Mode 2: Direct Product Page URL (Public View)</option>
                                <option value="3">Mode 3: Custom URL Pattern</option>
                            </select>
                        </div>

                        {(qrConfig.mode === '3' || qrConfig.mode === 'Custom URL') && (
                            <div className={styles.formGroup}>
                                <label>Custom URL Pattern (For Mode 3)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. https://mydomain.com/p/{sku}" 
                                    value={qrConfig.urlPattern || qrConfig.custom_url_pattern || ''} 
                                    onChange={e => setQrConfig({...qrConfig, urlPattern: e.target.value, custom_url_pattern: e.target.value})} 
                                />
                                <span style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block'}}>
                                    Use <code>&#123;sku&#125;</code> as placeholder for product SKU code. Example: <code>https://mywebsite.com/item/&#123;sku&#125;</code>
                                </span>
                            </div>
                        )}

                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('qr_config', qrConfig)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save Settings
                        </button>
                    </div>
                )}

                {/* 6. Payment Methods */}
                {activeTab === 'payments' && (
                    <div className={styles.card}>
                        <h2><CreditCard size={20} /> 6. Payment Methods</h2>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={payments.cash} disabled /> Cash (নগদ) - Always On
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={payments.bkash} onChange={e => setPayments({...payments, bkash: e.target.checked})} /> bKash
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={payments.nagad} onChange={e => setPayments({...payments, nagad: e.target.checked})} /> Nagad
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={payments.rocket} onChange={e => setPayments({...payments, rocket: e.target.checked})} /> Rocket
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={payments.bank} onChange={e => setPayments({...payments, bank: e.target.checked})} /> Bank Transfer
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={payments.card} onChange={e => setPayments({...payments, card: e.target.checked})} /> Card (POS Terminal)
                            </label>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('payments', payments)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 7. Inventory */}
                {activeTab === 'inventory' && (
                    <div className={styles.card}>
                        <h2><Package size={20} /> 7. Inventory Settings</h2>
                        <div className={styles.formGroup}>
                            <label>Default Low Stock Alert</label>
                            <input type="number" value={invSettings.lowStockAlert} onChange={e => setInvSettings({...invSettings, lowStockAlert: Number(e.target.value)})} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={invSettings.allowNegative} onChange={e => setInvSettings({...invSettings, allowNegative: e.target.checked})} /> Allow negative stock
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={invSettings.showOnPos} onChange={e => setInvSettings({...invSettings, showOnPos: e.target.checked})} /> Show stock on POS
                            </label>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('inventory_settings', invSettings)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 8. Feature Toggles */}
                {activeTab === 'features' && (
                    <div className={styles.card}>
                        <h2><ToggleLeft size={20} /> 8. Feature Toggles</h2>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.variants} onChange={e => setFeatures({...features, variants: e.target.checked})} /> Product Variations (Size/Color)
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.subCategories} onChange={e => setFeatures({...features, subCategories: e.target.checked})} /> Sub-Categories
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.expense} onChange={e => setFeatures({...features, expense: e.target.checked})} /> Expense Tracking
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.suppliers} onChange={e => setFeatures({...features, suppliers: e.target.checked})} /> Supplier Management
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.returns} onChange={e => setFeatures({...features, returns: e.target.checked})} /> Sale Returns
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.staffLog} onChange={e => setFeatures({...features, staffLog: e.target.checked})} /> Staff Activity Log
                            </label>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.toggleLabel}>
                                <input type="checkbox" checked={features.holdCart} onChange={e => setFeatures({...features, holdCart: e.target.checked})} /> Hold Cart functionality
                            </label>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('features', features)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 9. Appearance */}
                {activeTab === 'appearance' && (
                    <div className={styles.card}>
                        <h2><Palette size={20} /> 9. Appearance</h2>
                        <div className={styles.formGroup}>
                            <label>Theme</label>
                            <select value={appearance.theme} onChange={e => setAppearance({...appearance, theme: e.target.value})}>
                                <option value="Dark">Dark</option>
                                <option value="Light">Light</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Primary Color</label>
                            <input type="color" value={appearance.primaryColor} onChange={e => setAppearance({...appearance, primaryColor: e.target.value})} style={{height: '50px'}} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Language</label>
                            <select value={appearance.language} onChange={e => setAppearance({...appearance, language: e.target.value})}>
                                <option value="বাংলা">বাংলা (Bangla)</option>
                                <option value="English">English</option>
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>POS Product View</label>
                            <select value={appearance.posView} onChange={e => setAppearance({...appearance, posView: e.target.value})}>
                                <option value="Grid">Grid</option>
                                <option value="List">List</option>
                            </select>
                        </div>
                        <button className={styles.saveButton} disabled={saving} onClick={() => handleSave('appearance', appearance)}>
                            <Save size={16} style={{display:'inline', marginRight: '5px', verticalAlign: 'text-bottom'}}/> Save
                        </button>
                    </div>
                )}

                {/* 10. Data Management */}
                {activeTab === 'data' && (
                    <div className={styles.card}>
                        <h2><Database size={20} /> 10. Data Management</h2>
                        <div className={styles.formGroup} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            <button className={styles.saveButton} onClick={handleSync} disabled={isSyncing} style={{background: 'var(--primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'}}>
                                <CloudSync size={18} />
                                {isSyncing ? 'Syncing...' : 'Force Cloud Sync (Push & Pull)'}
                            </button>
                            <button className={styles.saveButton} style={{background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--border)'}}>
                                Download Backup (JSON)
                            </button>
                            <button className={styles.saveButton} style={{background: 'var(--surface)', color: 'var(--text-main)', border: '1px solid var(--border)'}}>
                                Import Data
                            </button>
                            <button className={styles.saveButton} style={{background: 'var(--danger)', marginTop: '2rem'}}>
                                ⚠️ Clear All Sales Data
                            </button>
                            <button className={styles.saveButton} style={{background: 'var(--danger)'}}>
                                ⚠️ Delete Account permanently
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
