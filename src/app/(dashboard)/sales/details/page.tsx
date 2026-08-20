'use client'

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Printer, Undo2 } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

function SaleDetailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const saleId = searchParams.get('id') as string;
    const { storeId } = useAuth();
    
    const sale = useLiveQuery(() => localDB.sales.get(saleId), [saleId]);
    const items = useLiveQuery(() => localDB.saleItems.where('sale_id').equals(saleId).toArray(), [saleId]) || [];
    const payments = useLiveQuery(() => localDB.salePayments.where('sale_id').equals(saleId).toArray(), [saleId]) || [];
    const customer = useLiveQuery(async () => sale?.customer_id ? await localDB.customers.get(sale.customer_id) : null, [sale?.customer_id]);
    const staff = useLiveQuery(async () => sale?.staff_id ? await localDB.staff.get(sale.staff_id) : null, [sale?.staff_id]);
    const storeSettings = useLiveQuery(() => localDB.settings.toArray()) || [];
    const bizInfo = storeSettings.find(s => s.setting_key === 'business_info')?.setting_value || {};
    const receiptSetting = storeSettings.find(s => s.setting_key === 'receipt')?.setting_value || {};

    const priorReturns: any[] = [];
    const returnableItems = items.filter((it: any) => it.quantity > 0);

    const handleReprintReceipt = () => {
        if (!sale) return;

        const storeName = bizInfo.name || 'QRPOS Store';
        const storePhone = bizInfo.phone || '';
        const storeAddress = bizInfo.address || '';
        const logoUrl = bizInfo.logo_url || '';
        const footerMsg = receiptSetting.footer || 'Thank you for your business!';
        const paperSize = receiptSetting.paperSize || '80mm Thermal';

        const printWindow = window.open('', '', 'width=800,height=600');
        if (!printWindow) {
            alert('Please allow popups to print receipts.');
            return;
        }

        const itemsHtml = items.map((it: any) => `
            <tr style="border-bottom: 1px dashed #eee;">
                <td style="padding: 4px 0;">${it.product_name}</td>
                <td style="padding: 4px 0; text-align: center;">${it.quantity}</td>
                <td style="padding: 4px 0; text-align: right;">৳${it.unit_price}</td>
                <td style="padding: 4px 0; text-align: right;">৳${it.total.toFixed(2)}</td>
            </tr>
        `).join('');

        const paymentsHtml = payments.map((p: any) => `
            <div style="display: flex; justify-content: space-between;">
                <span style="text-transform: capitalize;">${p.payment_method} ${p.reference_no ? `(${p.reference_no})` : ''}:</span>
                <span>৳${p.amount.toFixed(2)}</span>
            </div>
        `).join('');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Receipt - ${sale.invoice_no}</title>
                <style>
                    body { font-family: monospace; font-size: ${paperSize === '58mm Thermal' ? '11px' : '12px'}; margin: 0; padding: 10px; background: #fff; color: #000; }
                    .receipt { max-width: ${paperSize === '58mm Thermal' ? '260px' : '340px'}; margin: 0 auto; padding: 10px; }
                    .text-center { text-align: center; }
                    .border-bottom { border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px; }
                    .border-top { border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px; }
                    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <div class="receipt">
                    ${logoUrl ? `<div class="text-center" style="margin-bottom:6px;"><img src="${logoUrl}" style="max-height:45px;max-width:100px;" /></div>` : ''}
                    <h2 class="text-center" style="margin: 0 0 4px 0; font-size: ${paperSize === '58mm Thermal' ? '14px' : '16px'};">${storeName}</h2>
                    ${storePhone ? `<div class="text-center" style="font-size:10px;">Phone: ${storePhone}</div>` : ''}
                    ${storeAddress ? `<div class="text-center" style="font-size:10px;margin-bottom:8px;">${storeAddress}</div>` : ''}

                    <div class="border-bottom">
                        <div>Invoice: <strong>${sale.invoice_no}</strong></div>
                        <div>Date: ${new Date(sale.sale_date).toLocaleString()}</div>
                        <div>Customer: ${customer?.name || 'Walk-in Customer'}</div>
                        <div>Cashier: ${staff?.name || 'Owner Staff'}</div>
                    </div>

                    <table>
                        <thead>
                            <tr style="border-bottom: 1px dashed #000;">
                                <th style="padding:4px 0;text-align:left;">Item</th>
                                <th style="padding:4px 0;text-align:center;">Qty</th>
                                <th style="padding:4px 0;text-align:right;">Price</th>
                                <th style="padding:4px 0;text-align:right;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div class="border-top" style="display:flex;flex-direction:column;gap:4px;">
                        <div style="display:flex;justify-content:space-between;">
                            <span>Subtotal:</span>
                            <span>৳${sale.subtotal.toFixed(2)}</span>
                        </div>
                        ${sale.discount_amount > 0 ? `
                        <div style="display:flex;justify-content:space-between;">
                            <span>Discount:</span>
                            <span>-৳${sale.discount_amount.toFixed(2)}</span>
                        </div>` : ''}
                        ${sale.tax_amount > 0 ? `
                        <div style="display:flex;justify-content:space-between;">
                            <span>Tax:</span>
                            <span>+৳${sale.tax_amount.toFixed(2)}</span>
                        </div>` : ''}
                        <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:13px;margin-top:4px;padding-top:4px;border-top:1px solid #000;">
                            <span>Grand Total:</span>
                            <span>৳${sale.total.toFixed(2)}</span>
                        </div>
                        ${paymentsHtml}
                        ${sale.due_amount > 0 ? `
                        <div style="display:flex;justify-content:space-between;color:red;font-weight:bold;margin-top:4px;">
                            <span>Due Amount:</span>
                            <span>৳${sale.due_amount.toFixed(2)}</span>
                        </div>` : ''}
                    </div>

                    ${footerMsg ? `<div class="text-center" style="margin-top:12px;font-style:italic;font-size:10px;border-top:1px dashed #ccc;padding-top:6px;">${footerMsg}</div>` : ''}
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => { window.close(); }, 500);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (!sale) return <div style={{padding: '2rem'}}>Sale not found</div>;

    return (
        <div style={{padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'system-ui, sans-serif'}}>
            <button onClick={() => router.back()} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontWeight: 600}}>
                <ArrowLeft size={16} /> Back to Sales
            </button>

            <div style={{background: 'var(--surface)', padding: '2rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}}>
                
                {/* Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem', marginBottom: '1.5rem'}}>
                    <div>
                        <h1 style={{fontSize: '1.5rem', margin: '0 0 0.5rem 0'}}>Invoice: {sale.invoice_no}</h1>
                        <p style={{margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem'}}>Date: {new Date(sale.sale_date).toLocaleString()}</p>
                    </div>
                    <div style={{textAlign: 'right'}}>
                        <p style={{margin: '0 0 0.25rem 0', fontWeight: 600}}>Cashier: {staff?.name || 'Unknown'}</p>
                        <p style={{margin: 0, color: 'var(--text-muted)'}}>Customer: {customer?.name || 'Walk-in Customer'}</p>
                    </div>
                </div>

                {/* Items */}
                <div style={{marginBottom: '2rem'}}>
                    <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Items</h3>
                    <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--border)', color: 'var(--text-muted)'}}>
                                <th style={{padding: '0.5rem 0'}}>Item</th>
                                <th style={{padding: '0.5rem 0'}}>Qty</th>
                                <th style={{padding: '0.5rem 0'}}>Price</th>
                                <th style={{padding: '0.5rem 0', textAlign: 'right'}}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => {
                                const returnedQty = priorReturns.filter(pr => pr.sale_item_id === item.id).reduce((sum, pr) => sum + pr.quantity, 0);
                                return (
                                <tr key={item.id} style={{borderBottom: '1px solid var(--border)'}}>
                                    <td style={{padding: '0.75rem 0'}}>
                                        {item.product_name}
                                        {returnedQty > 0 && <span style={{display: 'inline-block', marginLeft: '0.5rem', padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px'}}>Returned: {returnedQty}</span>}
                                    </td>
                                    <td style={{padding: '0.75rem 0'}}>{item.quantity}</td>
                                    <td style={{padding: '0.75rem 0'}}>৳ {item.unit_price}</td>
                                    <td style={{padding: '0.75rem 0', textAlign: 'right', fontWeight: 600}}>৳ {item.total.toFixed(2)}</td>
                                </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Totals & Payments */}
                <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    {/* Payments */}
                    <div style={{flex: 1, paddingRight: '2rem'}}>
                        <h3 style={{margin: '0 0 1rem 0', fontSize: '1.1rem'}}>Payments</h3>
                        {payments.length === 0 ? (
                            <p style={{margin: 0, color: 'var(--text-muted)'}}>No payment records.</p>
                        ) : payments.map(p => (
                            <div key={p.id} style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                                <span style={{textTransform: 'capitalize'}}>{p.payment_method} {p.reference_no ? `(${p.reference_no})` : ''}</span>
                                <span style={{fontWeight: 600}}>৳ {p.amount.toFixed(2)}</span>
                            </div>
                        ))}
                        {sale.due_amount > 0 && (
                            <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border)'}}>
                                <span style={{color: 'var(--danger)', fontWeight: 600}}>Due Amount</span>
                                <span style={{color: 'var(--danger)', fontWeight: 600}}>৳ {sale.due_amount.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* Totals */}
                    <div style={{flex: 1, paddingLeft: '2rem', borderLeft: '1px solid var(--border)'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--text-muted)'}}>Subtotal</span>
                            <span>৳ {sale.subtotal.toFixed(2)}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--text-muted)'}}>Discount</span>
                            <span style={{color: 'var(--danger)'}}>- ৳ {sale.discount_amount.toFixed(2)}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                            <span style={{color: 'var(--text-muted)'}}>Tax</span>
                            <span>+ ৳ {sale.tax_amount?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)', fontSize: '1.25rem', fontWeight: 800}}>
                            <span>Total</span>
                            <span>৳ {sale.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div style={{display: 'flex', gap: '1rem', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)'}}>
                    <button 
                        onClick={handleReprintReceipt} 
                        style={{
                            flex: 1, 
                            padding: '0.85rem 1.25rem', 
                            background: 'var(--primary)', 
                            color: '#ffffff', 
                            border: 'none', 
                            borderRadius: 'var(--radius)', 
                            cursor: 'pointer', 
                            display: 'flex', 
                            justifyContent: 'center', 
                            alignItems: 'center', 
                            gap: '0.5rem', 
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            boxShadow: '0 2px 10px rgba(59, 130, 246, 0.25)'
                        }}
                    >
                        <Printer size={18} color="#ffffff" /> Reprint Receipt
                    </button>
                    {returnableItems.length > 0 && (
                        <button 
                            onClick={() => router.push(`/sales/return?id=${sale.id}`)} 
                            style={{
                                flex: 1, 
                                padding: '0.85rem 1.25rem', 
                                background: 'rgba(239, 68, 68, 0.12)', 
                                color: '#ef4444', 
                                border: '1px solid rgba(239, 68, 68, 0.3)', 
                                borderRadius: 'var(--radius)', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                fontWeight: 600,
                                fontSize: '0.95rem'
                            }}
                        >
                            <Undo2 size={18} color="#ef4444" /> Return Items
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
}

export default function SaleDetailPage() {
    return (
        <Suspense fallback={<div style={{padding: '2rem'}}>Loading sale details...</div>}>
            <SaleDetailContent />
        </Suspense>
    );
}
