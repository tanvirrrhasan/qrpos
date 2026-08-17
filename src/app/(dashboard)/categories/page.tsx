'use client'

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, FolderTree } from 'lucide-react';
import styles from './categories.module.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function CategoriesPage() {
    const { hasPermission } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCat, setEditingCat] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        name: '',
        parent_id: '',
        color: '#3b82f6',
        icon: '🛒',
        description: ''
    });

    // Fetch data
    const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];
    const products = useLiveQuery(() => localDB.products.toArray(), []) || [];
    const settings = useLiveQuery(() => localDB.settings.where('setting_key').equals('features').first(), []);
    
    const hasSubCategories = settings?.setting_value?.subCategories === true;

    useEffect(() => {
        supabase.rpc('get_auth_store_id').then(({ data }) => setStoreId(data));
    }, []);

    // Derived data
    const rootCategories = categories.filter(c => !c.parent_id);
    
    const getProductCount = (categoryId: string) => {
        return products.filter(p => p.category_id === categoryId).length;
    };

    if (!hasPermission('can_manage_categories')) {
        return (
            <div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view categories.</p>
                </div>
            </div>
        );
    }

    const getSubCategories = (parentId: string) => {
        return categories.filter(c => c.parent_id === parentId);
    };

    const handleOpenModal = (cat?: any) => {
        if (cat) {
            setEditingCat(cat);
            setForm({
                name: cat.name,
                parent_id: cat.parent_id || '',
                color: cat.color || '#3b82f6',
                icon: cat.icon || '🛒',
                description: cat.description || ''
            });
        } else {
            setEditingCat(null);
            setForm({ name: '', parent_id: '', color: '#3b82f6', icon: '🛒', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        setSaving(true);
        
        try {
            const payload = {
                store_id: storeId,
                name: form.name,
                parent_id: form.parent_id || null, // null for root
                color: form.color,
                icon: form.icon,
                description: form.description,
                updated_at: new Date().toISOString()
            };

            if (editingCat) {
                const { error } = await supabase.from('categories').update(payload).eq('id', editingCat.id);
                if (error) throw error;
                await localDB.categories.update(editingCat.id, payload as any);
            } else {
                const id = uuidv4();
                const { error } = await supabase.from('categories').insert({ id, ...payload, created_at: new Date().toISOString() });
                if (error) throw error;
                await localDB.categories.put({ id, ...payload, created_at: new Date().toISOString() } as any);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            alert('Error: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (cat: any) => {
        const prodCount = getProductCount(cat.id);
        const subCount = getSubCategories(cat.id).length;
        
        let msg = `এই ক্যাটেগরিতে ${prodCount} টি পণ্য আছে। Delete করলে সেগুলো 'Uncategorized' হয়ে যাবে।`;
        if (cat.parent_id) {
            msg = `এই সাব-ক্যাটেগরিতে ${prodCount} টি পণ্য আছে। Delete করলে সেগুলো Parent category তে চলে যাবে।`;
        } else if (subCount > 0) {
            msg += `\nএর অধীনে ${subCount} টি সাব-ক্যাটেগরি আছে, সেগুলো Root ক্যাটেগরি হয়ে যাবে।`;
        }
        
        if (!confirm(`${msg}\n\nআপনি কি নিশ্চিত?`)) return;

        try {
            // If it's a sub-category, move products to parent first
            if (cat.parent_id && prodCount > 0) {
                await supabase.from('products').update({ category_id: cat.parent_id }).eq('category_id', cat.id);
                const prodsToUpdate = products.filter(p => p.category_id === cat.id);
                for(const p of prodsToUpdate) {
                    await localDB.products.update(p.id, { category_id: cat.parent_id });
                }
            }

            // The 'sub-categories become root' is handled automatically by ON DELETE SET NULL in SQL
            // But we must update local Dexie manually to reflect this
            const subs = getSubCategories(cat.id);
            for(const sub of subs) {
                await localDB.categories.update(sub.id, { parent_id: null as any });
            }

            // Finally, delete the category
            await supabase.from('categories').delete().eq('id', cat.id);
            await localDB.categories.delete(cat.id);

            // Also set products to null in localDB if it was a root category (since SQL handles DB side)
            if (!cat.parent_id && prodCount > 0) {
                const prodsToUpdate = products.filter(p => p.category_id === cat.id);
                for(const p of prodsToUpdate) {
                    await localDB.products.update(p.id, { category_id: null as any });
                }
            }

        } catch (err: any) {
            alert('Error deleting: ' + err.message);
        }
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Categories</h1>
                <button className={styles.addBtn} onClick={() => handleOpenModal()}>
                    <Plus size={20} /> Add Category
                </button>
            </div>

            <div className={styles.grid}>
                {rootCategories.map(cat => (
                    <div key={cat.id} className={styles.card}>
                        <div className={styles.actions}>
                            <button className={styles.actionBtn} onClick={() => handleOpenModal(cat)}><Edit size={16}/></button>
                            <button className={styles.actionBtn} onClick={() => handleDelete(cat)}><Trash2 size={16} color="var(--danger)"/></button>
                        </div>
                        
                        <div className={styles.cardHeader}>
                            <div className={styles.iconBox}>{cat.icon}</div>
                            <div className={styles.catInfo}>
                                <h3>{cat.name}</h3>
                                <div className={styles.prodCount}>{getProductCount(cat.id)} products</div>
                                <div className={styles.colorbar} style={{backgroundColor: cat.color}}></div>
                            </div>
                        </div>
                        
                        {hasSubCategories && getSubCategories(cat.id).length > 0 && (
                            <div className={styles.subList}>
                                <h4><FolderTree size={14} style={{display:'inline', marginRight:5}}/> Sub-categories:</h4>
                                {getSubCategories(cat.id).map(sub => (
                                    <div key={sub.id} className={styles.subItem}>
                                        <span>{sub.icon} {sub.name} <span className={styles.prodCount}>({getProductCount(sub.id)})</span></span>
                                        <div>
                                            <button className={styles.actionBtn} style={{padding:0, marginRight: 8}} onClick={() => handleOpenModal(sub)}><Edit size={14}/></button>
                                            <button className={styles.actionBtn} style={{padding:0}} onClick={() => handleDelete(sub)}><Trash2 size={14} color="var(--danger)"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
                
                {rootCategories.length === 0 && (
                    <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                        No categories found. Click 'Add Category' to create one.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>{editingCat ? 'Edit Category' : 'Add Category'}</h2>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}><X size={24}/></button>
                        </div>
                        
                        <form onSubmit={handleSave}>
                            <div className={styles.formGroup}>
                                <label>নাম (Name) *</label>
                                <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                            </div>

                            {hasSubCategories && (
                                <div className={styles.formGroup}>
                                    <label>Parent Category</label>
                                    <select value={form.parent_id} onChange={e => setForm({...form, parent_id: e.target.value})}>
                                        <option value="">None (Root Category)</option>
                                        {rootCategories.filter(c => c.id !== editingCat?.id).map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div style={{display: 'flex', gap: '1rem'}}>
                                <div className={styles.formGroup} style={{flex: 1}}>
                                    <label>রঙ (Color)</label>
                                    <input type="color" value={form.color} onChange={e => setForm({...form, color: e.target.value})} />
                                </div>
                                <div className={styles.formGroup} style={{flex: 1}}>
                                    <label>Icon / Emoji</label>
                                    <input type="text" value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} placeholder="e.g. 🍔" />
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label>বিবরণ (Description)</label>
                                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Saving...' : 'Save Category'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
