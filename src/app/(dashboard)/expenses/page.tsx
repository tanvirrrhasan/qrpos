'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { Plus, Search, Edit2, Trash, X, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import styles from '../products/products.module.css';
import { useAuth } from '@/lib/contexts/AuthContext';

const DEFAULT_CATEGORIES = [
    'ভাড়া (Rent)',
    'বিদ্যুৎ (Electricity)',
    'বেতন (Salary)',
    'পরিবহন (Transportation)',
    'রক্ষণাবেক্ষণ (Maintenance)',
    'অফিস সরবরাহ (Office Supplies)',
    'অন্যান্য (Others)'
];

export default function ExpensesPage() {
    const { hasPermission } = useAuth();
    const [storeId, setStoreId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // Filters
    const [dateFilter, setDateFilter] = useState(''); // YYYY-MM
    const [categoryFilter, setCategoryFilter] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);
    
    // Form State
    const [formCategoryId, setFormCategoryId] = useState('');
    const [formNewCategory, setFormNewCategory] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
    const [formDesc, setFormDesc] = useState('');
    const [formPaymentMethod, setFormPaymentMethod] = useState('cash');
    const [formRef, setFormRef] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        async function init() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            // Seed default categories if none exist
            if (data) {
                const count = await localDB.expenseCategories.count();
                if (count === 0) {
                    const defaults = DEFAULT_CATEGORIES.map(name => ({
                        id: uuidv4(),
                        store_id: data,
                        name,
                        is_default: true,
                        is_active: true,
                        created_at: new Date().toISOString()
                    }));
                    await localDB.expenseCategories.bulkAdd(defaults);
                }
            }
        }
        init();
        
        // Set default date filter to current month
        const today = new Date();
        setDateFilter(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    }, []);

    // Data fetching
    const categories = useLiveQuery(() => localDB.expenseCategories.toArray()) || [];
    const staffMembers = useLiveQuery(() => localDB.staff.toArray()) || [];
    const staffMap = useMemo(() => new Map(staffMembers.map(s => [s.auth_user_id || s.id, s.name])), [staffMembers]);
    
    const expenses = useLiveQuery(
        async () => {
            let collection = localDB.expenses.toCollection();
            const allExpenses = await collection.reverse().toArray();
            
            const categoryMap = new Map(categories.map(c => [c.id, c.name]));

            return allExpenses.map(exp => ({
                ...exp,
                category_name: exp.category_id ? categoryMap.get(exp.category_id) : 'Unknown',
                staff_name: exp.staff_id ? (staffMap.get(exp.staff_id) || 'Unknown') : 'Unknown'
            }));
        },
        [categories, staffMap]
    ) || [];

    // Filtered & Summary Calculations
    const filteredExpenses = useMemo(() => {
        return expenses.filter(exp => {
            let match = true;
            if (categoryFilter && exp.category_id !== categoryFilter) match = false;
            if (dateFilter && !exp.expense_date.startsWith(dateFilter)) match = false;
            return match;
        });
    }, [expenses, categoryFilter, dateFilter]);

    const todaysTotal = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        return expenses
            .filter(e => e.expense_date.startsWith(todayStr))
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);

    const thisMonthTotal = useMemo(() => {
        const monthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
        return expenses
            .filter(e => e.expense_date.startsWith(monthStr))
            .reduce((sum, e) => sum + e.amount, 0);
    }, [expenses]);

    // Handlers
    const openModal = (expense?: any) => {
        if (expense) {
            setEditingExpense(expense);
            setFormCategoryId(expense.category_id);
            setFormAmount(expense.amount.toString());
            setFormDate(expense.expense_date.split('T')[0]);
            setFormDesc(expense.description || '');
            setFormPaymentMethod(expense.payment_method);
            setFormRef(expense.reference || '');
        } else {
            setEditingExpense(null);
            setFormCategoryId('');
            setFormAmount('');
            setFormDate(new Date().toISOString().split('T')[0]);
            setFormDesc('');
            setFormPaymentMethod('cash');
            setFormRef('');
        }
        setFormNewCategory('');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return;
        
        let targetCategoryId = formCategoryId;
        const amount = Number(formAmount);
        if (isNaN(amount) || amount <= 0) return alert('Enter valid amount');

        setProcessing(true);
        try {
            // Create new category if selected
            if (targetCategoryId === 'new') {
                if (!formNewCategory.trim()) {
                    setProcessing(false);
                    return alert('Enter new category name');
                }
                const newCat = {
                    id: uuidv4(),
                    store_id: storeId,
                    name: formNewCategory.trim(),
                    is_default: false,
                    is_active: true,
                    created_at: new Date().toISOString()
                };
                await localDB.expenseCategories.put(newCat);
                targetCategoryId = newCat.id;
            } else if (!targetCategoryId) {
                setProcessing(false);
                return alert('Select a category');
            }

            const expenseData = {
                id: editingExpense ? editingExpense.id : uuidv4(),
                store_id: storeId,
                category_id: targetCategoryId,
                staff_id: userId || undefined,
                amount,
                description: formDesc,
                payment_method: formPaymentMethod,
                reference: formRef,
                expense_date: new Date(formDate).toISOString(),
                created_at: editingExpense ? editingExpense.created_at : new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_synced: false
            };

            await localDB.expenses.put(expenseData);
            
            // Log
            await localDB.activityLog.put({
                id: uuidv4(),
                store_id: storeId,
                staff_id: userId || undefined,
                action: editingExpense ? 'expense_updated' : 'expense_created',
                entity_type: 'expense',
                entity_id: expenseData.id,
                details: { amount },
                created_at: new Date().toISOString()
            });

            setIsModalOpen(false);
        } catch (err: any) {
            alert('Error saving expense: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this expense?')) return;
        try {
            await localDB.expenses.delete(id);
        } catch (err) {
            console.error(err);
        }
    };

    if (!hasPermission('can_manage_expenses')) {
        return (
            <div className={styles.productsPage} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)' }}>You do not have permission to view expenses.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.productsPage}>
            
            {/* Summary Cards */}
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{width: '48px', height: '48px', borderRadius: '50%', background: '#eff6ff', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>Today's Expenses</p>
                        <h2 style={{margin: '0.25rem 0 0 0', fontSize: '1.5rem'}}>৳ {todaysTotal.toFixed(2)}</h2>
                    </div>
                </div>
                <div style={{background: 'var(--surface)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem'}}>
                    <div style={{width: '48px', height: '48px', borderRadius: '50%', background: '#fef2f2', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        <Filter size={24} />
                    </div>
                    <div>
                        <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>This Month's Expenses</p>
                        <h2 style={{margin: '0.25rem 0 0 0', fontSize: '1.5rem', color: 'var(--danger)'}}>৳ {thisMonthTotal.toFixed(2)}</h2>
                    </div>
                </div>
            </div>

            <div className={styles.header}>
                <h1>Expense Management</h1>
                <button className={styles.addButton} onClick={() => openModal()}>
                    <Plus size={20} /> Add Expense
                </button>
            </div>

            <div className={styles.toolbar} style={{display: 'flex', gap: '1rem'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)'}}>
                    <label style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Month:</label>
                    <input 
                        type="month" 
                        value={dateFilter} 
                        onChange={e => setDateFilter(e.target.value)} 
                        style={{border: 'none', background: 'transparent', outline: 'none'}}
                    />
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid var(--border)'}}>
                    <label style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>Category:</label>
                    <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{border: 'none', background: 'transparent', outline: 'none'}}>
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Category</th>
                            <th>Description</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Recorded By</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredExpenses.length === 0 ? (
                            <tr>
                                <td colSpan={7} style={{textAlign: 'center', padding: '2rem', color: 'var(--text-muted)'}}>
                                    No expenses found for selected filters.
                                </td>
                            </tr>
                        ) : filteredExpenses.map(exp => (
                            <tr key={exp.id}>
                                <td data-label="Date">{new Date(exp.expense_date).toLocaleDateString()}</td>
                                <td data-label="Category"><span style={{background: 'var(--background)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.85rem'}}>{exp.category_name}</span></td>
                                <td data-label="Description" style={{maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}} title={exp.description}>{exp.description || '-'}</td>
                                <td data-label="Amount" style={{fontWeight: 600, color: 'var(--danger)'}}>৳ {exp.amount.toFixed(2)}</td>
                                <td data-label="Payment Method" style={{textTransform: 'capitalize'}}>{exp.payment_method}</td>
                                <td data-label="Recorded By">{exp.staff_name}</td>
                                <td data-label="Actions">
                                    <div style={{display: 'flex', gap: '0.5rem'}}>
                                        <button className={styles.actionBtn} onClick={() => openModal(exp)} title="Edit" style={{color: 'var(--primary)'}}>
                                            <Edit2 size={16} />
                                        </button>
                                        <button className={styles.actionBtn} onClick={() => handleDelete(exp.id)} title="Delete" style={{color: 'var(--danger)'}}>
                                            <Trash size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', width: '500px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
                            <h2 style={{margin: 0, fontSize: '1.25rem'}}>{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
                            <button onClick={() => setIsModalOpen(false)} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)'}}><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                            
                            <div>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Category *</label>
                                <select 
                                    value={formCategoryId} 
                                    onChange={e => setFormCategoryId(e.target.value)} 
                                    required 
                                    style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}}
                                >
                                    <option value="" disabled>Select a category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    <option value="new">+ Add New Category</option>
                                </select>
                            </div>

                            {formCategoryId === 'new' && (
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>New Category Name *</label>
                                    <input 
                                        type="text" 
                                        value={formNewCategory} 
                                        onChange={e => setFormNewCategory(e.target.value)} 
                                        required 
                                        placeholder="e.g. Marketing"
                                        style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}}
                                    />
                                </div>
                            )}

                            <div>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Amount *</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    value={formAmount} 
                                    onChange={e => setFormAmount(e.target.value)} 
                                    required 
                                    placeholder="0.00"
                                    style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '1.2rem', fontWeight: 'bold'}}
                                />
                            </div>

                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Date *</label>
                                    <input 
                                        type="date" 
                                        value={formDate} 
                                        onChange={e => setFormDate(e.target.value)} 
                                        required 
                                        style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}}
                                    />
                                </div>
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Payment Method *</label>
                                    <select 
                                        value={formPaymentMethod} 
                                        onChange={e => setFormPaymentMethod(e.target.value)} 
                                        required 
                                        style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}}
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="bank">Bank</option>
                                        <option value="bkash">bKash</option>
                                        <option value="nagad">Nagad</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Description (Optional)</label>
                                <textarea 
                                    value={formDesc} 
                                    onChange={e => setFormDesc(e.target.value)} 
                                    rows={2} 
                                    style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', resize: 'vertical'}}
                                    placeholder="What was this expense for?"
                                />
                            </div>

                            {formPaymentMethod !== 'cash' && (
                                <div>
                                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500}}>Reference / TrxID (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={formRef} 
                                        onChange={e => setFormRef(e.target.value)} 
                                        style={{width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)'}}
                                    />
                                </div>
                            )}

                            <button 
                                type="submit" 
                                disabled={processing}
                                style={{width: '100%', padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, fontSize: '1rem', cursor: processing ? 'not-allowed' : 'pointer', marginTop: '0.5rem', opacity: processing ? 0.7 : 1}}
                            >
                                {processing ? 'Saving...' : 'Save Expense'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
