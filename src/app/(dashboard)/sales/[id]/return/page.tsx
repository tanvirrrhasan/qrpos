'use client'

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, RotateCcw, Save } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { useAuth } from '@/lib/contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { mutateData } from '@/lib/sync';

export default function SaleReturnPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { storeId, profile } = useAuth();
    
    const [returnQty, setReturnQty] = useState<Record<string, number>>({});
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const sale = useLiveQuery(() => localDB.sales.get(id), [id]);
    const saleItems = useLiveQuery(() => localDB.saleItems.where('sale_id').equals(id).toArray(), [id]) || [];
    const products = useLiveQuery(() => localDB.products.toArray(), []) || [];
    const priorReturns = useLiveQuery(() => localDB.saleReturnItems.where('store_id').equals(storeId || '').toArray(), [storeId]) || [];

    if (!sale) return <div style={{ padding: '2rem' }}>Loading sale data...</div>;

    // Calculate maximum returnable quantities
    const maxReturnable = saleItems.reduce((acc, item) => {
        const alreadyReturned = priorReturns.filter(pr => pr.sale_item_id === item.id).reduce((sum, pr) => sum + pr.quantity, 0);
        acc[item.id] = item.quantity - alreadyReturned;
        return acc;
    }, {} as Record<string, number>);

    // Handle quantity input
    const handleQtyChange = (itemId: string, val: string) => {
        let num = parseInt(val) || 0;
        const max = maxReturnable[itemId] || 0;
        if (num < 0) num = 0;
        if (num > max) num = max;
        
        setReturnQty(prev => ({ ...prev, [itemId]: num }));
    };

    // Calculate refund
    let totalRefund = 0;
    const itemsToReturn: any[] = [];
    saleItems.forEach(item => {
        const qty = returnQty[item.id] || 0;
        if (qty > 0) {
            const refund = qty * item.unit_price;
            totalRefund += refund;
            itemsToReturn.push({ item, qty, refund });
        }
    });

    const handleProcessReturn = async () => {
        if (!storeId || !profile?.id) return;
        if (itemsToReturn.length === 0) return alert("Select at least one item to return.");
        if (!confirm(`Are you sure you want to process this return and refund ৳${totalRefund}?`)) return;

        setSaving(true);
        try {
            const returnId = uuidv4();
            const now = new Date().toISOString();

            // 1. Create Sale Return Record
            const returnPayload = {
                id: returnId,
                store_id: storeId,
                sale_id: sale.id,
                customer_id: sale.customer_id || undefined,
                staff_id: profile.id,
                total_refund: totalRefund,
                refund_method: 'Cash', // hardcoded for MVP
                reason,
                return_date: now,
                created_at: now
            };
            await mutateData('sale_returns', 'create', returnPayload, localDB.saleReturns);

            // 2. Create Return Items & Adjust Stock
            for (const { item, qty, refund } of itemsToReturn) {
                const returnItemPayload = {
                    id: uuidv4(),
                    store_id: storeId,
                    return_id: returnId,
                    sale_item_id: item.id,
                    product_id: item.product_id,
                    variant_id: item.variant_id || undefined,
                    quantity: qty,
                    unit_price: item.unit_price,
                    refund_amount: refund,
                    created_at: now
                };
                await mutateData('sale_return_items', 'create', returnItemPayload, localDB.saleReturnItems);

                // Adjust Stock in products
                const prod = products.find(p => p.id === item.product_id);
                if (prod) {
                    const newStock = prod.stock + qty;
                    await mutateData('products', 'update', { id: prod.id, stock: newStock, updated_at: now }, localDB.products);
                    
                    // Stock History
                    const stockHistPayload = {
                        id: uuidv4(),
                        store_id: storeId,
                        product_id: prod.id,
                        action: 'sale_return',
                        quantity_change: qty,
                        stock_before: prod.stock,
                        stock_after: newStock,
                        reference_id: returnId,
                        notes: `Returned from invoice ${sale.invoice_no}`,
                        created_at: now
                    };
                    await mutateData('stock_history', 'create', stockHistPayload, localDB.stock_history);
                }
            }

            alert('Sale return processed successfully!');
            router.push('/sales');
        } catch (err: any) {
            console.error(err);
            alert('Return failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <Link href="/sales" style={{ color: 'var(--text-muted)' }}><ArrowLeft size={18} /></Link>
                <h2>Process Return: {sale.invoice_no}</h2>
            </div>

            <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '0.75rem 0' }}>Product</th>
                            <th style={{ padding: '0.75rem 0' }}>Price</th>
                            <th style={{ padding: '0.75rem 0' }}>Purchased</th>
                            <th style={{ padding: '0.75rem 0' }}>Max Return</th>
                            <th style={{ padding: '0.75rem 0', width: '120px' }}>Return Qty</th>
                            <th style={{ padding: '0.75rem 0', textAlign: 'right' }}>Refund</th>
                        </tr>
                    </thead>
                    <tbody>
                        {saleItems.map(item => {
                            const max = maxReturnable[item.id] || 0;
                            const qty = returnQty[item.id] || 0;
                            const refund = qty * item.unit_price;

                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem 0', fontWeight: 500 }}>{item.product_name}</td>
                                    <td style={{ padding: '1rem 0' }}>৳{item.unit_price}</td>
                                    <td style={{ padding: '1rem 0' }}>{item.quantity}</td>
                                    <td style={{ padding: '1rem 0', color: max === 0 ? 'var(--text-muted)' : 'inherit' }}>{max}</td>
                                    <td style={{ padding: '1rem 0' }}>
                                        <input 
                                            type="number" 
                                            min="0" 
                                            max={max}
                                            value={qty}
                                            onChange={(e) => handleQtyChange(item.id, e.target.value)}
                                            disabled={max === 0}
                                            style={{ width: '80px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)' }}
                                        />
                                    </td>
                                    <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 600 }}>৳{refund}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Return Reason (Optional)</label>
                    <textarea 
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="e.g. Damaged product, changed mind..."
                        rows={4}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', resize: 'vertical' }}
                    ></textarea>
                </div>
                <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Items to Return:</span>
                        <span style={{ fontWeight: 600 }}>{itemsToReturn.reduce((sum, i) => sum + i.qty, 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        <span>Total Refund:</span>
                        <span style={{ color: 'var(--danger)', fontWeight: 700 }}>৳{totalRefund}</span>
                    </div>
                    <button 
                        onClick={handleProcessReturn} 
                        disabled={saving || itemsToReturn.length === 0}
                        style={{ width: '100%', padding: '1rem', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', cursor: (saving || itemsToReturn.length === 0) ? 'not-allowed' : 'pointer', opacity: (saving || itemsToReturn.length === 0) ? 0.6 : 1 }}
                    >
                        <RotateCcw size={18} />
                        {saving ? 'Processing...' : 'Process Return'}
                    </button>
                </div>
            </div>
        </div>
    );
}
