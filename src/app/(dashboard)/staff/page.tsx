'use client'

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { Plus, Edit2, Trash, X, Lock, Shield, Check, History } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import styles from '../products/products.module.css';
import { useAuth } from '@/lib/contexts/AuthContext';

import { DEFAULT_PERMISSIONS, PERMISSION_LABELS, PermissionKey } from '@/lib/permissions';
import { Staff } from '@/lib/types';

export default function StaffPage() {
    const { role, hasPermission } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);
    const [showActivityLog, setShowActivityLog] = useState<string | null>(null); // staff_id
    
    // Form State
    const [formName, setFormName] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formEmail, setFormEmail] = useState('');
    const [formPassword, setFormPassword] = useState(''); // Only for UI mockup
    const [formRole, setFormRole] = useState<'owner' | 'admin' | 'manager' | 'cashier'>('cashier');
    const [formPin, setFormPin] = useState('');
    const [formIsActive, setFormIsActive] = useState(true);
    
    // Permission Overrides
    const [permissions, setPermissions] = useState<any>({});
    
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        async function init() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
        }
        init();
    }, []);

    // Data fetching
    const staffMembers = useLiveQuery(() => localDB.staff.toArray()) || [];
    const activities = useLiveQuery(async () => {
        if (!showActivityLog) return [];
        const targetStaff = staffMembers.find(s => s.id === showActivityLog);
        const allLogs = await localDB.activityLog.toArray();
        return allLogs.filter(act => {
            if (!targetStaff) return true;
            return act.staff_id === targetStaff.id || act.staff_id === targetStaff.auth_user_id || !act.staff_id;
        }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    }, [showActivityLog, staffMembers]) || [];

    // Form Handlers
    const handleRoleChange = (role: 'owner' | 'admin' | 'manager' | 'cashier') => {
        setFormRole(role);
        // Reset permissions to default for this role when changed, unless editing an existing custom set
        setPermissions({ ...DEFAULT_PERMISSIONS[role] });
    };

    const openModal = (staff?: any) => {
        if (staff) {
            setEditingStaff(staff);
            setFormName(staff.name);
            setFormPhone(staff.phone || '');
            setFormEmail(staff.email || '');
            setFormPassword(''); // Don't show existing password
            setFormRole(staff.role);
            setFormPin(staff.pin_code || '');
            setFormIsActive(staff.is_active);
            setPermissions(staff.permissions || DEFAULT_PERMISSIONS[staff.role]);
        } else {
            setEditingStaff(null);
            setFormName('');
            setFormPhone('');
            setFormEmail('');
            setFormPassword('');
            setFormRole('cashier');
            setFormPin('');
            setFormIsActive(true);
            setPermissions({ ...DEFAULT_PERMISSIONS['cashier'] });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        
        setProcessing(true);
        try {
            const staffData = {
                id: editingStaff ? editingStaff.id : uuidv4(),
                store_id: storeId,
                name: formName,
                phone: formPhone,
                email: formEmail,
                role: formRole,
                permissions: permissions,
                pin_code: formPin,
                is_active: formIsActive,
                created_at: editingStaff ? editingStaff.created_at : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                // auth_user_id normally comes from Supabase Auth after createUser
                auth_user_id: editingStaff ? editingStaff.auth_user_id : `mock-auth-${uuidv4().slice(0,8)}`
            };

            await localDB.staff.put(staffData);
            
            // Log action
            await localDB.activityLog.put({
                id: uuidv4(),
                store_id: storeId,
                staff_id: 'owner', // Hardcoded as owner taking action for now
                action: editingStaff ? 'staff_updated' : 'staff_created',
                entity_type: 'staff',
                entity_id: staffData.id,
                details: { role: formRole },
                created_at: new Date().toISOString()
            });

            setIsModalOpen(false);
        } catch (err: any) {
            alert('Error saving staff: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to deactivate/delete this staff member?')) return;
        try {
            await localDB.staff.delete(id);
        } catch (err) {
            console.error(err);
        }
    };

    const togglePermission = (key: string) => {
        setPermissions((prev: any) => {
            const currentVal = prev[key] ?? (DEFAULT_PERMISSIONS[formRole as keyof typeof DEFAULT_PERMISSIONS] as any)?.[key] ?? false;
            return { ...prev, [key]: !currentVal };
        });
    };

    if (!hasPermission('can_manage_staff')) {
        return (
            <div className={styles.productsPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view staff management.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productsPage}>
            
            <div className={styles.header}>
                <h1>Staff Management</h1>
                <button className={styles.addButton} onClick={() => openModal()}>
                    <Plus size={20} /> Add Staff
                </button>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Last Login</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staffMembers.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                                    No staff members found. Add one to get started.
                                </td>
                            </tr>
                        ) : staffMembers.map(staff => (
                            <tr key={staff.id} style={{opacity: staff.is_active ? 1 : 0.6}}>
                                <td data-label="Name" style={{fontWeight: 500}}>{staff.name}</td>
                                <td data-label="Phone">{staff.phone || '-'}</td>
                                <td data-label="Role">
                                    <span style={{
                                        background: staff.role === 'owner' ? '#fef2f2' : staff.role === 'admin' ? '#fffbeb' : '#eff6ff',
                                        color: staff.role === 'owner' ? '#dc2626' : staff.role === 'admin' ? '#d97706' : '#2563eb',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        textTransform: 'capitalize',
                                        fontWeight: 600
                                    }}>
                                        {staff.role}
                                    </span>
                                </td>
                                <td data-label="Status">
                                    {staff.is_active ? 
                                        <span style={{color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}><Check size={16}/> Active</span> : 
                                        <span style={{color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}><X size={16}/> Inactive</span>
                                    }
                                </td>
                                <td data-label="Last Login" style={{color: 'var(--text-muted)'}}>{staff.last_login_at ? new Date(staff.last_login_at).toLocaleString() : 'Never'}</td>
                                <td data-label="Actions">
                                    <div style={{display: 'flex', gap: '0.5rem'}}>
                                        <button className={styles.actionBtn} onClick={() => setShowActivityLog(staff.id)} title="Activity Log" style={{color: 'var(--primary)'}}>
                                            <History size={16} />
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => openModal(staff)} title="Edit" style={{color: 'var(--primary)'}}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => handleDelete(staff.id)} title="Delete/Deactivate" style={{color: 'var(--danger)'}}>
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'}}>
                    <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', width: '600px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                            <h2 style={{margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <Shield size={24} color="var(--primary)" />
                                {editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Name (নাম) *</label>
                                    <input type="text" value={formName} onChange={e => setFormName(e.target.value)} required style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Phone (ফোন) *</label>
                                    <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)} required style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Email *</label>
                                    <input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} required style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Password {editingStaff ? '(Leave blank to keep)' : '*'}</label>
                                    <input type="password" minLength={6} value={formPassword} onChange={e => setFormPassword(e.target.value)} required={!editingStaff} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                                </div>
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Role *</label>
                                    <select value={formRole} onChange={e => handleRoleChange(e.target.value as any)} required style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', textTransform: 'capitalize'}}>
                                        <option value="owner">Owner</option>
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="cashier">Cashier</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>PIN Code (4-digit)</label>
                                    <input type="text" maxLength={4} pattern="\d{4}" placeholder="e.g. 1234" value={formPin} onChange={e => setFormPin(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}} />
                                </div>
                            </div>

                            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', marginTop: '0.5rem'}}>
                                <input type="checkbox" checked={formIsActive} onChange={e => setFormIsActive(e.target.checked)} style={{width: '1.2rem', height: '1.2rem'}} />
                                <strong>Active Account</strong>
                            </label>

                            {/* Permissions Override */}
                            <div style={{marginTop: '1rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--background)'}}>
                                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                                    <h3 style={{margin: 0, fontSize: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                        <Lock size={18} /> Custom Permissions (Overrides)
                                    </h3>
                                    <button 
                                        type="button" 
                                        onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                                        style={{background: 'none', border: '1px solid var(--border)', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-muted)'}}
                                    >
                                        {showAdvancedPerms ? 'Hide Advanced' : 'Show Advanced'}
                                    </button>
                                </div>
                                
                                <p style={{fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem'}}>
                                    By default, these are set based on the {formRole} role. Check/uncheck to override.
                                </p>
                                
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem'}}>
                                    {Object.entries(PERMISSION_LABELS).map(([key, label]) => {
                                        // Skip advanced ones if not showing
                                        if (!showAdvancedPerms && !['can_give_discount', 'can_add_customers', 'can_receive_due'].includes(key)) {
                                            return null;
                                        }
                                        
                                        const isChecked = permissions[key] ?? (DEFAULT_PERMISSIONS[formRole as keyof typeof DEFAULT_PERMISSIONS] as any)?.[key] ?? false;
                                        
                                        return (
                                            <label key={key} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}}>
                                                <input 
                                                    type="checkbox" 
                                                    checked={isChecked} 
                                                    onChange={() => togglePermission(key)} 
                                                />
                                                {label}
                                            </label>
                                        );
                                    })}
                                    
                                    {/* Discount Limit Input */}
                                    {(permissions.can_give_discount ?? (DEFAULT_PERMISSIONS[formRole as keyof typeof DEFAULT_PERMISSIONS] as any)?.can_give_discount) && (
                                        <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem'}}>
                                            Max Discount %:
                                            <input 
                                                type="number" 
                                                max="100" 
                                                min="0" 
                                                value={permissions.max_discount ?? (DEFAULT_PERMISSIONS[formRole as keyof typeof DEFAULT_PERMISSIONS] as any)?.max_discount ?? 0} 
                                                onChange={e => setPermissions({...permissions, max_discount: Number(e.target.value)})} 
                                                style={{width: '60px', padding: '0.2rem', borderRadius: '4px', border: '1px solid var(--border)'}} 
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={processing}
                                style={{width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '1rem', cursor: processing ? 'not-allowed' : 'pointer', marginTop: '1rem'}}
                            >
                                {processing ? 'Saving...' : 'Save Staff'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Activity Log Modal */}
            {showActivityLog && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'}}>
                    <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                            <h2 style={{margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                                <History size={24} color="var(--primary)" />
                                Activity Log
                            </h2>
                            <button onClick={() => setShowActivityLog(null)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><X size={20} /></button>
                        </div>
                        
                        <div style={{flex: 1, overflowY: 'auto', paddingRight: '0.5rem'}}>
                            {activities.length === 0 ? (
                                <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0'}}>No recent activity found for this staff member.</p>
                            ) : (
                                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                                    {activities.map(act => {
                                        const actionTitle = (() => {
                                            switch (act.action) {
                                                case 'user_login': return '🔑 লগইন (Logged In)';
                                                case 'user_logout': return '🚪 লগআউট (Logged Out)';
                                                case 'sale_created': return '🛒 নতুন বিক্রি (New Sale Completed)';
                                                case 'due_payment_received': return '💰 বাকি আদায় (Received Due Payment)';
                                                case 'stock_adjusted': return '📦 স্টক পরিবর্তন (Stock Adjusted)';
                                                case 'product_created': return '✨ পণ্য যোগ (Product Added)';
                                                case 'product_updated': return '✏️ পণ্য ও দাম পরিবর্তন (Product/Price Edited)';
                                                case 'product_deleted': return '🗑️ পণ্য নিষ্ক্রিয়/ডিলেট (Product Deleted)';
                                                case 'customer_created': return '👤 নতুন কাস্টমার যোগ (Customer Created)';
                                                case 'customer_updated': return '✏️ কাস্টমার তথ্য আপডেট (Customer Updated)';
                                                case 'customer_deleted': return '❌ কাস্টমার ডিলেট (Customer Deleted)';
                                                case 'expense_created': return '💸 খরচ যোগ (Expense Created)';
                                                case 'expense_updated': return '✏️ খরচ আপডেট (Expense Updated)';
                                                case 'purchase_created': return '🚚 মালামাল ক্রয় (Purchase Order Created)';
                                                case 'supplier_payment': return '🏦 সাপ্লায়ার বিল পরিশোধ (Supplier Paid)';
                                                case 'settings_updated': return '⚙️ সেটিংস পরিবর্তন (Settings Updated)';
                                                case 'staff_created': return '👔 নতুন স্টাফ যোগ (Staff Account Created)';
                                                case 'staff_updated': return '🔒 স্টাফ পারমিশন আপডেট (Staff Rights Updated)';
                                                default: return act.action.replace('_', ' ');
                                            }
                                        })();

                                        return (
                                            <div key={act.id} style={{padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--background)'}}>
                                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                                                    <strong style={{fontSize: '0.95rem'}}>{actionTitle}</strong>
                                                    <span style={{fontSize: '0.85rem', color: 'var(--text-muted)'}}>{new Date(act.created_at).toLocaleString()}</span>
                                                </div>
                                                <div style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'capitalize'}}>
                                                    বিষয়: {act.entity_type} {act.entity_id ? `(${act.entity_id.slice(0,8)})` : ''}
                                                </div>
                                                {act.details && (
                                                    <pre style={{margin: '0.5rem 0 0 0', padding: '0.5rem', background: 'rgba(0,0,0,0.03)', borderRadius: '4px', fontSize: '0.8rem', overflowX: 'auto'}}>
                                                        {JSON.stringify(act.details, null, 2)}
                                                    </pre>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
