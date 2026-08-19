'use client'

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { localDB } from '@/lib/db/local';
import { Printer, Download, AlertCircle } from 'lucide-react';
import QRCode from 'qrcode';
import styles from './inv.module.css';

function InvoiceContent() {
    const searchParams = useSearchParams();
    const saleId = searchParams.get('id') || searchParams.get('no');
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState<any>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!saleId) {
            setErrorMsg('Invalid or missing invoice identification link.');
            setLoading(false);
            return;
        }

        const targetId = saleId;

        async function loadInvoiceData() {
            setLoading(true);
            try {
                // Generate QR data URL for current page URL
                try {
                    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
                    if (currentUrl) {
                        const url = await QRCode.toDataURL(currentUrl, { margin: 1, width: 120 });
                        setQrDataUrl(url);
                    }
                } catch (e) { }

                // 1. Try Supabase RPC first
                let { data, error } = await supabase.rpc('get_public_invoice_by_id', { v_sale_id: targetId });

                if (!error && data && data.success) {
                    setInvoice(data);
                    setLoading(false);
                    return;
                }

                // 2. Try direct Supabase query by ID or invoice_no
                const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetId);
                let query = supabase.from('sales').select('*');
                if (isUuid) {
                    query = query.eq('id', targetId);
                } else {
                    query = query.eq('invoice_no', targetId);
                }

                const { data: sData, error: sErr } = await query.single();

                if (!sErr && sData) {
                    // Fetch items, store, staff, customer, store_settings
                    const { data: itemsData } = await supabase.from('sale_items').select('*').eq('sale_id', sData.id);
                    const { data: storeData } = await supabase.from('stores').select('*').eq('id', sData.store_id).single();
                    const { data: custData } = sData.customer_id ? await supabase.from('customers').select('*').eq('id', sData.customer_id).single() : { data: null };
                    const { data: staffData } = sData.staff_id ? await supabase.from('staff').select('*').eq('id', sData.staff_id).single() : { data: null };
                    const { data: settData } = await supabase.from('store_settings').select('*').eq('store_id', sData.store_id).eq('setting_key', 'receipt').single();
                    const { data: bizSettData } = await supabase.from('store_settings').select('*').eq('store_id', sData.store_id).eq('setting_key', 'business_info').single();

                    const bizVal = bizSettData?.setting_value || {};

                    setInvoice({
                        success: true,
                        invoice_no: sData.invoice_no,
                        sale_date: sData.sale_date,
                        subtotal: Number(sData.subtotal),
                        discount_amount: Number(sData.discount_amount),
                        tax_amount: Number(sData.tax_amount),
                        total: Number(sData.total),
                        paid_amount: Number(sData.paid_amount),
                        due_amount: Number(sData.due_amount),
                        change_amount: Number(sData.change_amount),
                        payment_status: sData.payment_status,
                        notes: sData.notes,
                        store: {
                            name: bizVal.name || storeData?.name || '',
                            address: bizVal.address || storeData?.address || '',
                            phone: bizVal.phone || storeData?.phone || '',
                            logo_url: bizVal.logo || storeData?.logo_url || null
                        },
                        customer: custData ? { name: custData.name, phone: custData.phone } : null,
                        cashier_name: staffData?.name || 'Staff',
                        receipt_settings: settData?.setting_value || {},
                        items: (itemsData || []).map((it: any) => ({
                            product_name: it.product_name,
                            variant_info: it.variant_info,
                            quantity: Number(it.quantity),
                            unit_price: Number(it.unit_price),
                            total: Number(it.total)
                        }))
                    });
                    setLoading(false);
                    return;
                }

                // 3. Fallback to Local IndexedDB
                let localSale = isUuid ? await localDB.sales.get(targetId) : await localDB.sales.where('invoice_no').equals(targetId).first();
                if (localSale) {
                    const localItems = await localDB.saleItems.where('sale_id').equals(localSale.id).toArray();
                    const cust = localSale.customer_id ? await localDB.customers.get(localSale.customer_id) : null;
                    const st = localSale.staff_id ? await localDB.staff.get(localSale.staff_id) : null;
                    const bizSetting = await localDB.settings.get('business_info');
                    const rcptSetting = await localDB.settings.get('receipt');

                    setInvoice({
                        success: true,
                        invoice_no: localSale.invoice_no,
                        sale_date: localSale.sale_date,
                        subtotal: Number(localSale.subtotal),
                        discount_amount: Number(localSale.discount_amount),
                        tax_amount: Number(localSale.tax_amount),
                        total: Number(localSale.total),
                        paid_amount: Number(localSale.paid_amount),
                        due_amount: Number(localSale.due_amount),
                        change_amount: Number(localSale.change_amount),
                        payment_status: localSale.payment_status,
                        notes: localSale.notes,
                        store: {
                            name: bizSetting?.setting_value?.name || '',
                            address: bizSetting?.setting_value?.address || '',
                            phone: bizSetting?.setting_value?.phone || '',
                            logo_url: bizSetting?.setting_value?.logo || null
                        },
                        customer: cust ? { name: cust.name, phone: cust.phone } : null,
                        cashier_name: st?.name || 'Staff',
                        receipt_settings: rcptSetting?.setting_value || {},
                        items: localItems.map((it: any) => ({
                            product_name: it.product_name,
                            variant_info: it.variant_info,
                            quantity: Number(it.quantity),
                            unit_price: Number(it.unit_price),
                            total: Number(it.total)
                        }))
                    });
                    setLoading(false);
                    return;
                }

                setErrorMsg('Invoice details could not be found or link has expired.');
                setLoading(false);
            } catch (err) {
                console.error(err);
                setErrorMsg('Error loading digital invoice.');
                setLoading(false);
            }
        }

        loadInvoiceData();
    }, [saleId]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <div style={{ textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace' }}>
                    <div style={{ width: 36, height: 36, border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }} />
                    <p style={{ fontWeight: 600 }}>Loading Receipt...</p>
                </div>
            </div>
        );
    }

    if (errorMsg || !invoice) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.receiptCard} style={{ textAlign: 'center', padding: '2rem 1.5rem', maxWidth: '340px' }}>
                    <AlertCircle size={42} color="#ef4444" style={{ margin: '0 auto 0.75rem auto' }} />
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 'bold', margin: '0 0 0.5rem 0', color: '#000' }}>Invoice Not Found</h2>
                    <p style={{ color: '#475569', fontSize: '0.85rem', margin: 0 }}>{errorMsg || 'The requested receipt does not exist.'}</p>
                </div>
            </div>
        );
    }

    const { store, customer, items, invoice_no, sale_date, subtotal, discount_amount, tax_amount, total, paid_amount, due_amount, cashier_name, receipt_settings } = invoice;

    const showLogo = receipt_settings?.showLogo !== false;
    const showCustomer = receipt_settings?.showCustomer !== false;
    const showCashier = receipt_settings?.showCashier !== false;
    const showQR = receipt_settings?.showQR !== false;
    const footerMsg = receipt_settings?.footer || 'ধন্যবাদ! আবার আসবেন।';
    const paperSize = receipt_settings?.size || '80mm';

    const formattedDate = new Date(sale_date).toLocaleString();

    return (
        <div className={styles.pageContainer}>
            <div className={styles.receiptWrapper}>

                {/* Thermal Receipt Card */}
                <div className={styles.receiptCard} id="printableReceipt" style={{ maxWidth: paperSize === '58mm Thermal' ? '280px' : '360px' }}>

                    {/* Header */}
                    <div className={styles.storeHeader}>
                        {showLogo && store?.logo_url && (
                            <img src={store.logo_url} className={styles.storeLogo} alt="Logo" />
                        )}
                        <h2 className={styles.storeName}>{store?.name || ''}</h2>
                        {store?.phone && <div className={styles.storeMeta}>Phone: {store.phone}</div>}
                        {store?.address && <div className={styles.storeMeta}>{store.address}</div>}
                    </div>

                    {/* Meta Details */}
                    <div className={styles.invoiceMeta}>
                        <div>Invoice: <strong>{invoice_no}</strong></div>
                        <div>Date: {formattedDate}</div>
                        {showCustomer && <div>Customer: {customer?.name || 'Walk-in Customer'}</div>}
                        {showCashier && <div>Cashier: {cashier_name || 'Staff'}</div>}
                    </div>

                    {/* Items Table */}
                    <table className={styles.itemsTable}>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style={{ textAlign: 'center' }}>Qty</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(items || []).map((it: any, idx: number) => (
                                <tr key={idx}>
                                    <td>
                                        <div>{it.product_name}</div>
                                        {it.variant_info && <div style={{ fontSize: '10px', color: '#475569' }}>{it.variant_info}</div>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>{it.quantity}</td>
                                    <td style={{ textAlign: 'right' }}>৳{Number(it.total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Financial Summary */}
                    <div className={styles.summarySection}>
                        <div className={styles.summaryRow}>
                            <span>Subtotal:</span>
                            <span>৳ {subtotal.toFixed(2)}</span>
                        </div>
                        {discount_amount > 0 && (
                            <div className={styles.summaryRow}>
                                <span>Discount:</span>
                                <span>- ৳ {discount_amount.toFixed(2)}</span>
                            </div>
                        )}
                        {tax_amount > 0 && (
                            <div className={styles.summaryRow}>
                                <span>VAT / Tax:</span>
                                <span>+ ৳ {tax_amount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className={styles.grandTotalRow}>
                            <span>Grand Total:</span>
                            <span>৳ {total.toFixed(2)}</span>
                        </div>
                        <div className={styles.summaryRow} style={{ marginTop: '4px' }}>
                            <span>Paid (CASH):</span>
                            <span>৳ {paid_amount.toFixed(2)}</span>
                        </div>
                        <div className={styles.summaryRow}>
                            <span>Due:</span>
                            <span>৳ {due_amount.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* QR Code */}
                    {showQR && qrDataUrl && (
                        <div className={styles.qrSection}>
                            <img src={qrDataUrl} className={styles.qrImage} alt="Invoice QR" />
                            <div className={styles.qrCaption}>Scan for Digital Invoice</div>
                        </div>
                    )}

                    {/* Footer Message */}
                    {footerMsg && (
                        <div className={styles.footerText}>
                            {footerMsg}
                        </div>
                    )}
                </div>

                {/* Bottom Actions */}
                <div className={styles.actionsBar}>
                    <button className={styles.actionBtn} onClick={handlePrint}>
                        <Printer size={18} /> Print
                    </button>
                    <button className={styles.actionBtn} onClick={handleDownload}>
                        <Download size={18} /> Download
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function PublicInvoicePage() {
    return (
        <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: '#fff', fontFamily: 'monospace' }}>Loading Receipt...</div>}>
            <InvoiceContent />
        </Suspense>
    );
}
