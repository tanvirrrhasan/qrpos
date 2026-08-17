'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Search, Camera, CameraOff, Upload, X, Minus, Plus, Trash2, List, Image as ImageIcon, Tag, Printer, UserPlus, ChevronDown, ChevronUp, Package, ShoppingCart, Clock, Banknote, Smartphone, CreditCard, CheckCircle, Download, Share2 } from 'lucide-react';
import styles from './pos.module.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductVariant, HeldCart } from '@/lib/types';
import { Html5Qrcode } from 'html5-qrcode';
import { parseQRContent } from '@/lib/qr-parser';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { DEFAULT_PERMISSIONS } from '@/lib/permissions';

interface CartItem {
    id: string;
    product_id: string;
    variant_id?: string;
    name: string;
    variant_info?: string;
    unit_price: number;
    purchase_price: number;
    quantity: number;
    max_stock: number;
    discount: number;
}

export default function POSPage() {
    const { hasPermission, profile, role } = useAuth();
    const { showToast } = useToast();
    const staffId = profile?.id || null;
    const [storeId, setStoreId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [searchQ, setSearchQ] = useState('');
    const [activeCat, setActiveCat] = useState<string>('all');
    const [showMobileProducts, setShowMobileProducts] = useState(false);


    const maxDiscountPct = Number(profile?.permissions?.max_discount ?? (role ? DEFAULT_PERMISSIONS[role as keyof typeof DEFAULT_PERMISSIONS]?.max_discount : 0) ?? 0);

    // Cart State
    const [cart, setCart] = useState<CartItem[]>([]);

    // Modals
    const [variantModal, setVariantModal] = useState<Product | null>(null);
    const [checkoutModal, setCheckoutModal] = useState(false);
    const [heldListModal, setHeldListModal] = useState(false);
    const [receiptData, setReceiptData] = useState<any | null>(null);
    const [addCustomerModal, setAddCustomerModal] = useState(false);

    // Scanner State
    const [isCameraActive, setIsCameraActive] = useState(true);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Checkout State
    const [overallDiscount, setOverallDiscount] = useState<{ type: '%' | '৳', value: number }>({ type: '৳', value: 0 });
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [isDue, setIsDue] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bkash' | 'nagad' | 'card'>('cash');
    const [paidAmountInput, setPaidAmountInput] = useState<number | ''>('');
    const [refNo, setRefNo] = useState('');
    const [checkoutNotes, setCheckoutNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    // Searchable Customer Dropdown State
    const [custSearch, setCustSearch] = useState('');
    const [showCustDropdown, setShowCustDropdown] = useState(false);
    const custDropdownRef = useRef<HTMLDivElement>(null);

    // New Customer State
    const [newCustName, setNewCustName] = useState('');
    const [newCustPhone, setNewCustPhone] = useState('');

    // Fetch Data
    const products = useLiveQuery(() => localDB.products.filter(p => p.is_active).toArray(), []) || [];
    const variants = useLiveQuery(() => localDB.productVariants.toArray(), []) || [];
    const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];
    const customers = useLiveQuery(() => localDB.customers.toArray(), []) || [];
    const heldCarts = useLiveQuery(() => localDB.heldCarts.toArray(), []) || [];
    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];

    const productsRef = useRef(products);
    useEffect(() => {
        productsRef.current = products;
    }, [products]);

    const scannerLock = useRef<Promise<void>>(Promise.resolve());

    useEffect(() => {
        async function fetchAuth() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
        }
        fetchAuth();
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: any) {
            if (custDropdownRef.current && !custDropdownRef.current.contains(event.target)) {
                setShowCustDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Effect to auto-switch to cart tab on mobile if item added
    useEffect(() => {
        if (cart.length > 0 && window.innerWidth <= 768) {
            // Can optionally scroll to cart here if needed
        }
    }, [cart]);

    // Filter Products
    const filteredProducts = products.filter(p => {
        if (activeCat !== 'all' && p.category_id !== activeCat) return false;
        if (searchQ && !p.name.toLowerCase().includes(searchQ.toLowerCase()) && !p.sku.toLowerCase().includes(searchQ.toLowerCase())) return false;
        return true;
    });

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.phone?.includes(custSearch)
    );

    const getCustomerName = (id: string | null) => {
        if (!id) return 'Walk-in Customer';
        const c = customers.find(c => c.id === id);
        return c ? `${c.name} - ${c.phone || ''}` : 'Walk-in Customer';
    };

    // --- CART LOGIC ---
    const addToCart = (product: Product, variant?: ProductVariant) => {
        const stock = variant ? variant.stock : product.stock;
        if (stock <= 0) return showToast('Out of stock!', 'error');

        setCart(prevCart => {
            const existing = prevCart.find(c => c.product_id === product.id && c.variant_id === (variant?.id || undefined));
            if (existing) {
                if (existing.quantity >= stock) {
                    showToast('Max stock reached', 'error');
                    return prevCart;
                }
                return prevCart.map(c => c.id === existing.id ? { ...c, quantity: c.quantity + 1 } : c);
            } else {
                return [...prevCart, {
                    id: uuidv4(),
                    product_id: product.id,
                    variant_id: variant?.id,
                    name: product.name,
                    variant_info: variant?.variant_value,
                    unit_price: variant ? variant.selling_price : product.selling_price,
                    purchase_price: variant ? variant.purchase_price : product.purchase_price,
                    quantity: 1,
                    max_stock: stock,
                    discount: 0
                }];
            }
        });
        setVariantModal(null);
    };

    const updateQty = (id: string, delta: number) => {
        setCart(cart.map(c => {
            if (c.id === id) {
                const newQ = c.quantity + delta;
                if (newQ > c.max_stock) { showToast('Exceeds stock', 'error'); return c; }
                if (newQ < 1) return c; // use remove instead
                return { ...c, quantity: newQ };
            }
            return c;
        }));
    };

    const updateItemDiscount = (id: string) => {
        const item = cart.find(c => c.id === id);
        if (!item) return;
        const amtStr = prompt(`Enter discount amount for this item (৳) [Max allowed: ${maxDiscountPct}%]:`, '0');
        if (amtStr === null) return;
        const amt = Number(amtStr) || 0;

        const maxAmt = item.unit_price * (maxDiscountPct / 100);
        if (amt > maxAmt && role !== 'owner') {
            showToast(`Discount exceeds your allowed limit of ${maxDiscountPct}% (Max: ৳${maxAmt.toFixed(2)})`, 'error');
            return;
        }

        setCart(cart.map(c => c.id === id ? { ...c, discount: amt } : c));
    };

    const removeItem = (id: string) => setCart(cart.filter(c => c.id !== id));

    // Calculation
    const subtotal = cart.reduce((sum, item) => sum + ((item.unit_price - item.discount) * item.quantity), 0);
    const discAmount = overallDiscount.type === '৳' ? overallDiscount.value : (subtotal * overallDiscount.value / 100);
    // Enforce overall max discount check
    const grandTotal = Math.max(0, subtotal - discAmount);

    const handleOverallDiscountChange = (type: '%' | '৳', val: number) => {
        if (role !== 'owner') {
            const valPct = type === '%' ? val : (subtotal > 0 ? (val / subtotal) * 100 : 0);
            if (valPct > maxDiscountPct) {
                showToast(`Overall discount exceeds your allowed limit of ${maxDiscountPct}%`, 'error');
                return;
            }
        }
        setOverallDiscount({ type, value: val });
    };

    const actualPaid = isDue ? (Number(paidAmountInput) || 0) : grandTotal;
    const dueAmount = Math.max(0, grandTotal - actualPaid);
    const changeAmount = Math.max(0, actualPaid - grandTotal);

    // Update paid amount when toggling isDue
    useEffect(() => {
        if (!isDue) {
            setPaidAmountInput(grandTotal);
        } else {
            setPaidAmountInput('');
        }
    }, [isDue, grandTotal]);

    // --- HOLD CART ---
    const holdCart = async () => {
        if (cart.length === 0) return;
        if (!storeId) return;
        const label = prompt('Label for this cart? (Optional)');
        const hCart: HeldCart = {
            id: uuidv4(), store_id: storeId, staff_id: staffId || undefined, label: label || 'Unlabeled Cart',
            cart_data: { cart, overallDiscount, selectedCustomer },
            created_at: new Date().toISOString(), updated_at: new Date().toISOString()
        };
        await localDB.heldCarts.put(hCart);
        await supabase.from('held_carts').insert(hCart);
        setCart([]);
        setOverallDiscount({ type: '৳', value: 0 });
        setSelectedCustomer(null);
    };

    const resumeCart = async (hc: HeldCart) => {
        setCart(hc.cart_data.cart || []);
        setOverallDiscount(hc.cart_data.overallDiscount || { type: '৳', value: 0 });
        setSelectedCustomer(hc.cart_data.selectedCustomer || null);
        await localDB.heldCarts.delete(hc.id);
        await supabase.from('held_carts').delete().eq('id', hc.id);
        setHeldListModal(false);
    };

    const openCheckoutModalHandler = (fastCash: boolean = false) => {
        if (cart.length === 0) return;
        setIsDue(false);
        setPaymentMethod('cash');
        setCheckoutModal(true);
    };

    const handleQuickAddCustomer = async () => {
        if (!newCustName || !storeId) return showToast('Name is required', 'error');
        const newCust = {
            id: uuidv4(),
            store_id: storeId,
            name: newCustName,
            phone: newCustPhone,
            total_due: 0,
            created_at: new Date().toISOString()
        };
        await localDB.customers.put(newCust as any);
        try {
            await supabase.from('customers').insert(newCust);
        } catch (e) { }
        setSelectedCustomer(newCust.id);
        setAddCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
    };

    const lastScannedRef = useRef<string | null>(null);
    const clearScanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const playBeep = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            
            gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.1);
        } catch (e) {
            console.log('Audio beep error', e);
        }
    };

    // --- QR SCANNER LOGIC ---
    useEffect(() => {
        scannerLock.current = scannerLock.current.then(async () => {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("qr-reader-permanent", {
                    verbose: false
                });
            }

            if (!isCameraActive) {
                if (scannerRef.current.isScanning) {
                    await scannerRef.current.stop().catch(console.error);
                }
            } else {
                if (!scannerRef.current.isScanning) {
                    try {
                        await scannerRef.current.start(
                            { facingMode: "environment" },
                            {
                                fps: 10,
                                qrbox: (viewfinderWidth, viewfinderHeight) => {
                                    const minDim = Math.min(viewfinderWidth, viewfinderHeight);
                                    const boxSize = Math.floor(minDim * 0.8);
                                    return { width: boxSize, height: boxSize };
                                }
                            },
                            (decodedText) => onScanSuccess(decodedText),
                            (errorMessage) => { /* ignore per-frame scan errors */ }
                        );
                    } catch (err) {
                        console.error("Scanner error", err);
                    }
                }
            }
        });
    }, [isCameraActive]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            scannerLock.current.then(() => {
                if (scannerRef.current && scannerRef.current.isScanning) {
                    scannerRef.current.stop().catch(() => { });
                }
            });
        };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode("qr-reader-permanent", {
                    verbose: false
                });
            }
            // Stop scanning if currently active before scanning file
            if (scannerRef.current.isScanning) {
                scannerLock.current = scannerLock.current.then(async () => {
                    if (scannerRef.current?.isScanning) {
                        await scannerRef.current.stop().catch(console.error);
                        setIsCameraActive(false);
                    }
                });
                await scannerLock.current;
            }
            const decodedText = await scannerRef.current.scanFileV2(file);
            onScanSuccess(decodedText.decodedText);
        } catch (err) {
            showToast("No QR code found in the image.", 'error');
        }
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const onScanSuccess = (decodedText: string) => {
        if (clearScanTimeoutRef.current) clearTimeout(clearScanTimeoutRef.current);
        clearScanTimeoutRef.current = setTimeout(() => {
            lastScannedRef.current = null;
        }, 1000);

        if (lastScannedRef.current === decodedText) {
            return;
        }

        lastScannedRef.current = decodedText;

        playBeep();
        if (navigator.vibrate) navigator.vibrate(100);

        showToast(`Scanned: ${decodedText}`, 'info');

        const result = parseQRContent(decodedText);
        if (result.type === 'sku') {
            const p = productsRef.current.find(prod => prod.sku.toLowerCase() === result.identifier.toLowerCase());
            if (p) {
                if (p.has_variants) {
                    setVariantModal(p);
                } else {
                    addToCart(p);
                    showToast(`Added ${p.name} to cart!`, 'success');
                }
            } else {
                showToast(`Product not found for SKU: ${result.identifier}`, 'error');
            }
        } else {
            showToast(`Unknown QR format: ${decodedText}`, 'error');
        }
    };

    // --- CHECKOUT PROCESS ---
    const processCheckout = async () => {
        if (cart.length === 0) return showToast('Cart is empty', 'error');

        if (isDue && !selectedCustomer) return showToast('Customer is required for due sales!', 'error');
        if (!storeId) return;

        setProcessing(true);
        try {
            const saleId = uuidv4();
            const prefix = settings.find(s => s.setting_key === 'invoice_prefix')?.setting_value || 'INV-';
            const invNo = `${prefix}${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;

            const saleData = {
                id: saleId, store_id: storeId, invoice_no: invNo, customer_id: selectedCustomer || null,
                staff_id: staffId, subtotal, discount_type: overallDiscount.type, discount_value: overallDiscount.value,
                discount_amount: discAmount, tax_amount: 0, total: grandTotal,
                paid_amount: actualPaid > grandTotal ? grandTotal : actualPaid,
                due_amount: dueAmount,
                payment_status: dueAmount === 0 ? 'paid' : (actualPaid > 0 ? 'partial' : 'due'),
                change_amount: changeAmount, notes: checkoutNotes, sale_date: new Date().toISOString(),
                created_at: new Date().toISOString(), is_synced: false, local_id: saleId
            };

            const items = cart.map(c => ({
                id: uuidv4(), store_id: storeId, sale_id: saleId, product_id: c.product_id, variant_id: c.variant_id || null,
                product_name: c.name, variant_info: c.variant_info, unit_price: c.unit_price - c.discount, purchase_price: c.purchase_price,
                quantity: c.quantity, total: (c.unit_price - c.discount) * c.quantity, created_at: new Date().toISOString()
            }));

            for (let c of cart) {
                if (c.variant_id) {
                    const v = await localDB.productVariants.get(c.variant_id);
                    if (v) await localDB.productVariants.update(v.id, { stock: v.stock - c.quantity });
                } else {
                    const p = await localDB.products.get(c.product_id);
                    if (p) await localDB.products.update(p.id, { stock: p.stock - c.quantity });
                }
            }

            const payments = [];
            if (actualPaid > 0) {
                payments.push({
                    id: uuidv4(), store_id: storeId, sale_id: saleId,
                    payment_method: paymentMethod,
                    amount: actualPaid > grandTotal ? grandTotal : actualPaid,
                    reference_no: paymentMethod !== 'cash' ? refNo : null
                });
            }

            if (dueAmount > 0 && selectedCustomer) {
                const cust = await localDB.customers.get(selectedCustomer);
                if (cust) await localDB.customers.update(cust.id, { total_due: cust.total_due + dueAmount });
            }

            await localDB.sales.put(saleData as any);
            await localDB.saleItems.bulkPut(items as any);
            if (payments.length) await localDB.salePayments.bulkPut(payments as any);

            try {
                await supabase.from('sales').insert(saleData);
                await supabase.from('sale_items').insert(items);
                if (payments.length) await supabase.from('sale_payments').insert(payments);
                await localDB.sales.update(saleId, { is_synced: true });
            } catch (e) { console.log('Will sync later', e); }

            // Create Receipt Data
            const custObj = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null;
            const storeName = settings.find(s => s.setting_key === 'store_name')?.setting_value || 'QRPOS Store';
            const storePhone = settings.find(s => s.setting_key === 'store_phone')?.setting_value || '';
            const storeAddress = settings.find(s => s.setting_key === 'store_address')?.setting_value || '';

            setReceiptData({
                storeName, storePhone, storeAddress,
                invoiceNo: invNo,
                date: new Date().toLocaleString(),
                customerName: custObj?.name || 'Walk-in Customer',
                items: cart,
                subtotal, discAmount, grandTotal,
                paid: actualPaid, due: dueAmount, change: changeAmount,
                paymentMethod: paymentMethod.toUpperCase()
            });

            // Reset UI States
            setCart([]);
            setOverallDiscount({ type: '৳', value: 0 });
            setSelectedCustomer(null);
            setCheckoutModal(false);
            setPaidAmountInput('');
            setRefNo('');
            setCheckoutNotes('');
            setIsDue(false);

        } catch (err: any) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            setProcessing(false);
        }
    };

    const printReceipt = () => {
        const printContents = document.getElementById('receipt-print-area')?.innerHTML;
        if (!printContents) return;
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow?.document.write(`
            <html>
                <head>
                    <title>Print Receipt</title>
                    <style>
                        body { font-family: monospace; padding: 20px; font-size: 14px; color: #000; }
                        h2, h3, p { margin: 5px 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th, td { border-bottom: 1px dashed #ccc; padding: 5px 0; text-align: left; }
                        .right { text-align: right; }
                        .center { text-align: center; }
                        .totals { border-top: 1px solid #000; margin-top: 10px; padding-top: 10px; }
                        .totals div { display: flex; justify-content: space-between; margin-bottom: 5px; }
                        .bold { font-weight: bold; }
                    </style>
                </head>
                <body>
                    ${printContents}
                    <script>
                        window.onload = () => { window.print(); window.close(); }
                    </script>
                </body>
            </html>
        `);
        printWindow?.document.close();
    };

    const generateReceiptImageBlob = (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!receiptData) return resolve(null);

            const items = receiptData.items || [];
            const itemHeight = 22;
            const width = 360;

            const escapeXml = (str: string) => {
                if (!str) return '';
                return str.replace(/[<>&'"]/g, (c) => {
                    switch (c) {
                        case '<': return '&lt;';
                        case '>': return '&gt;';
                        case '&': return '&amp;';
                        case '\'': return '&apos;';
                        case '"': return '&quot;';
                        default: return c;
                    }
                });
            };

            let y = 30;
            const svgLines: string[] = [];

            // Store Name
            svgLines.push(`<text x="${width / 2}" y="${y}" font-family="monospace" font-size="16" font-weight="bold" text-anchor="middle" fill="#000000">${escapeXml(receiptData.storeName)}</text>`);
            y += 20;

            if (receiptData.storePhone) {
                svgLines.push(`<text x="${width / 2}" y="${y}" font-family="monospace" font-size="11" text-anchor="middle" fill="#333333">Phone: ${escapeXml(receiptData.storePhone)}</text>`);
                y += 16;
            }
            if (receiptData.storeAddress) {
                svgLines.push(`<text x="${width / 2}" y="${y}" font-family="monospace" font-size="11" text-anchor="middle" fill="#333333">${escapeXml(receiptData.storeAddress)}</text>`);
                y += 16;
            }

            y += 5;
            svgLines.push(`<line x1="15" y1="${y}" x2="${width - 15}" y2="${y}" stroke="#000000" stroke-dasharray="4" stroke-width="1"/>`);
            y += 18;

            // Header info
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Invoice: ${escapeXml(receiptData.invoiceNo)}</text>`);
            y += 16;
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Date: ${escapeXml(receiptData.date)}</text>`);
            y += 16;
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Customer: ${escapeXml(receiptData.customerName)}</text>`);
            y += 16;

            svgLines.push(`<line x1="15" y1="${y}" x2="${width - 15}" y2="${y}" stroke="#000000" stroke-dasharray="4" stroke-width="1"/>`);
            y += 18;

            // Table Header
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" font-weight="bold" fill="#000000">Item</text>`);
            svgLines.push(`<text x="${width - 90}" y="${y}" font-family="monospace" font-size="11" font-weight="bold" fill="#000000">Qty</text>`);
            svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" font-weight="bold" text-anchor="end" fill="#000000">Total</text>`);
            y += 8;

            svgLines.push(`<line x1="15" y1="${y}" x2="${width - 15}" y2="${y}" stroke="#000000" stroke-dasharray="2" stroke-width="1"/>`);
            y += 16;

            // Items
            items.forEach((it: any) => {
                const name = it.name + (it.variant_info ? ` (${it.variant_info})` : '');
                const truncatedName = name.length > 20 ? name.substring(0, 18) + '..' : name;
                const itemTotal = `৳${((it.unit_price - it.discount) * it.quantity).toFixed(2)}`;

                svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">${escapeXml(truncatedName)}</text>`);
                svgLines.push(`<text x="${width - 80}" y="${y}" font-family="monospace" font-size="11" fill="#000000">${it.quantity}</text>`);
                svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">${escapeXml(itemTotal)}</text>`);
                y += itemHeight;
            });

            svgLines.push(`<line x1="15" y1="${y}" x2="${width - 15}" y2="${y}" stroke="#000000" stroke-dasharray="4" stroke-width="1"/>`);
            y += 18;

            // Subtotal
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Subtotal:</text>`);
            svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">৳${receiptData.subtotal.toFixed(2)}</text>`);
            y += 16;

            if (receiptData.discAmount > 0) {
                svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Discount:</text>`);
                svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">-৳${receiptData.discAmount.toFixed(2)}</text>`);
                y += 16;
            }

            svgLines.push(`<line x1="15" y1="${y}" x2="${width - 15}" y2="${y}" stroke="#000000" stroke-width="1.5"/>`);
            y += 18;

            // Grand Total
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="13" font-weight="bold" fill="#000000">Grand Total:</text>`);
            svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="13" font-weight="bold" text-anchor="end" fill="#000000">৳${receiptData.grandTotal.toFixed(2)}</text>`);
            y += 20;

            // Paid & Due
            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Paid (${escapeXml(receiptData.paymentMethod)}):</text>`);
            svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">৳${receiptData.paid.toFixed(2)}</text>`);
            y += 16;

            svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Due:</text>`);
            svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">৳${receiptData.due.toFixed(2)}</text>`);
            y += 16;

            if (receiptData.change > 0) {
                svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">Change:</text>`);
                svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">৳${receiptData.change.toFixed(2)}</text>`);
                y += 16;
            }

            y += 10;
            svgLines.push(`<text x="${width / 2}" y="${y}" font-family="monospace" font-size="11" font-style="italic" text-anchor="middle" fill="#555555">Thank you for shopping with us!</text>`);
            y += 25; // bottom margin

            const height = y;
            const bgRect = `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
            const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${bgRect}${svgLines.join('')}</svg>`;

            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) return resolve(null);
            ctx.scale(2, 2);

            const img = new Image();
            const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(null);
            };

            img.src = url;
        });
    };

    const downloadReceipt = async () => {
        if (!receiptData) return;
        const blob = await generateReceiptImageBlob();
        if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Receipt-${receiptData.invoiceNo}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('Receipt image downloaded!', 'success');
        } else {
            showToast('Failed to generate image', 'error');
        }
    };

    const shareReceipt = async () => {
        if (!receiptData) return;
        const blob = await generateReceiptImageBlob();

        if (blob && typeof navigator !== 'undefined' && navigator.share) {
            const file = new File([blob], `Receipt-${receiptData.invoiceNo}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        title: `Receipt ${receiptData.invoiceNo}`,
                        text: `Invoice #${receiptData.invoiceNo} from ${receiptData.storeName}`,
                        files: [file],
                    });
                    return;
                } catch (err) {
                    console.log('Share canceled/failed', err);
                    return;
                }
            }
        }

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: `Receipt ${receiptData.invoiceNo}`,
                    text: `Invoice #${receiptData.invoiceNo} - Total: ৳${receiptData.grandTotal.toFixed(2)}`,
                });
            } catch (err) { }
        } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
            await navigator.clipboard.writeText(`Invoice #${receiptData.invoiceNo} - Total: ৳${receiptData.grandTotal.toFixed(2)}`);
            showToast('Receipt details copied to clipboard!', 'success');
        }
    };

    const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className={styles.container}>

            {/* Left Pane: Products & Scanner */}
            <div className={styles.leftPane}>

                {/* Permanent Scanner Area */}
                <div className={styles.scannerContainer}>
                    <div className={styles.scannerHeader}>
                        <h3><Camera size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> QR Scanner</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setIsCameraActive(!isCameraActive)}
                                className={styles.scannerActionBtn}
                                style={{ background: isCameraActive ? '#fee2e2' : 'var(--primary)', color: isCameraActive ? '#ef4444' : '#fff' }}
                            >
                                {isCameraActive ? <><CameraOff size={16} /> Pause</> : <><Camera size={16} /> Start</>}
                            </button>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className={styles.scannerActionBtn}
                            >
                                <Upload size={16} /> Upload
                            </button>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />
                        </div>
                    </div>
                    <div className={styles.scannerBody}>
                        <div
                            id="qr-reader-permanent"
                            style={{ 
                                width: '100%', 
                                aspectRatio: '2 / 1', 
                                borderRadius: 'var(--radius)', 
                                overflow: 'hidden', 
                                display: isCameraActive ? 'block' : 'none',
                                position: 'relative'
                            }}
                        ></div>
                        <style dangerouslySetInnerHTML={{__html: `
                            #qr-reader-permanent video {
                                object-fit: cover !important;
                                width: 100% !important;
                                height: 100% !important;
                            }
                        `}} />
                        {!isCameraActive && (
                            <div style={{ width: '100%', height: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--background)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>
                                <CameraOff size={48} style={{ marginBottom: 8, opacity: 0.5 }} />
                                <p>Camera Paused</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.searchBar}>
                    <input type="text" placeholder="Search by name or SKU..." value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                    <button
                        className={styles.mobileProductToggle}
                        onClick={() => setShowMobileProducts(!showMobileProducts)}
                        title="Toggle Product List"
                    >
                        <List size={20} />
                        {showMobileProducts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                <div className={`${styles.productSection} ${!showMobileProducts ? styles.hideOnMobile : ''}`}>
                    <div className={styles.categoryList}>
                        <button className={`${styles.categoryBtn} ${activeCat === 'all' ? styles.active : ''}`} onClick={() => setActiveCat('all')}>All Items</button>
                        {categories.map(c => (
                            <button key={c.id} className={`${styles.categoryBtn} ${activeCat === c.id ? styles.active : ''}`} onClick={() => setActiveCat(c.id)}>{c.name}</button>
                        ))}
                    </div>

                    <div className={styles.productGrid}>
                        {filteredProducts.map(p => (
                            <div key={p.id} className={`${styles.productCard} ${p.stock <= 0 && !p.has_variants ? styles.outOfStock : ''}`} onClick={() => {
                                if (p.has_variants) {
                                    setVariantModal(p);
                                } else {
                                    addToCart(p);
                                }
                            }}>
                                {!p.has_variants && (
                                    <div className={`${styles.stockBadge} ${p.stock === 0 ? styles.stockOut : p.stock <= p.low_stock_alert ? styles.stockLow : styles.stockGood}`}>
                                        {p.stock}
                                    </div>
                                )}
                                <div style={{ height: 80, background: 'var(--background)', borderRadius: 'var(--radius)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                    {p.thumbnail_url ? <img src={p.thumbnail_url} style={{ height: '100%', width: '100%', objectFit: 'cover' }} /> : <ImageIcon size={24} color="var(--text-muted)" />}
                                </div>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', lineHeight: 1.2 }}>{p.name}</div>
                                <div style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 'auto' }}>৳ {p.selling_price}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Pane: Cart */}
            <div className={styles.rightPane}>
                <div className={styles.cartHeader}>
                    <h2>🛒 Cart {cart.length > 0 && `(${cart.length})`}</h2>
                    <button className={styles.heldCartsBtn} onClick={() => setHeldListModal(true)}>
                        <List size={14} style={{ display: 'inline', marginRight: 4 }} /> Held ({heldCarts.length})
                    </button>
                </div>

                <div className={styles.cartItems}>
                    {cart.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>Cart is empty</div>}
                    {cart.map(item => (
                        <div key={item.id} className={styles.cartItem}>
                            <div className={styles.itemRow1}>
                                <div>
                                    <div className={styles.itemName}>{item.name}</div>
                                    {item.variant_info && <div className={styles.itemVar}>{item.variant_info}</div>}
                                    {item.discount > 0 && <div className={styles.itemVar} style={{ color: '#10b981' }}>- ৳{item.discount} discount</div>}
                                </div>
                                <div className={styles.itemPrice}>৳ {(item.unit_price - item.discount) * item.quantity}</div>
                            </div>
                            <div className={styles.itemRow2}>
                                <div className={styles.qtyControl}>
                                    <button className={styles.qtyBtn} onClick={() => updateQty(item.id, -1)}><Minus size={14} /></button>
                                    <input type="text" className={styles.qtyInput} value={item.quantity} readOnly />
                                    <button className={styles.qtyBtn} onClick={() => updateQty(item.id, 1)}><Plus size={14} /></button>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {hasPermission('can_give_discount') && (
                                        <button className={styles.discountBtn} onClick={() => updateItemDiscount(item.id)}><Tag size={14} /> Disc.</button>
                                    )}
                                    <button className={styles.removeBtn} onClick={() => removeItem(item.id)}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.cartSummary}>
                    <div className={styles.summaryRow}>
                        <span>Subtotal</span>
                        <span>৳ {subtotal.toFixed(2)}</span>
                    </div>
                </div>

                <div className={styles.cartActions}>
                    <button className={styles.holdBtn} onClick={holdCart} title="Hold Cart">
                        <Clock size={20} /> <span>Hold Cart</span>
                    </button>
                    <button className={styles.clearBtn} onClick={() => setCart([])} title="Clear Cart">
                        <Trash2 size={20} /> <span>Clear</span>
                    </button>
                    <button className={styles.fastCashBtn} onClick={() => setCheckoutModal(true)} disabled={cart.length === 0}>
                        Checkout (৳ {subtotal.toFixed(0)})
                    </button>
                </div>
            </div>

            {/* VARIANT MODAL */}
            {variantModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Select Variant: {variantModal.name}</h2>
                            <button className={styles.closeBtn} onClick={() => setVariantModal(null)}><X size={24} /></button>
                        </div>
                        <div className={styles.variantGrid}>
                            {variants.filter(v => v.product_id === variantModal.id).map(v => (
                                <div key={v.id} className={`${styles.variantCard} ${v.stock <= 0 ? styles.outOfStock : ''}`} onClick={() => { if (v.stock > 0) addToCart(variantModal, v); }}>
                                    <div style={{ fontWeight: 600 }}>{v.variant_value}</div>
                                    <div style={{ color: 'var(--primary)', marginTop: '0.25rem' }}>৳ {v.selling_price}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Stock: {v.stock}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKOUT MODAL (Redesigned with explicit instructions) */}
            {checkoutModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: 750, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                        <div className={styles.modalHeader} style={{ padding: '1rem 1rem 0 1rem', flexShrink: 0, marginBottom: '0.5rem' }}>
                            <h2>Complete Sale</h2>
                            <button className={styles.closeBtn} onClick={() => setCheckoutModal(false)}><X size={24} /></button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
                            <div className={styles.checkoutLayout}>

                                {/* Left Side: Summary & Discount */}
                                <div className={styles.checkoutLeft}>

                                    <div style={{ background: 'var(--background)', padding: '1rem', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Payable</div>
                                        <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>৳ {grandTotal.toFixed(2)}</div>
                                    </div>

                                    {hasPermission('can_give_discount') && (
                                        <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Overall Discount</label>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <input type="number" style={{ flex: 1, padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} value={overallDiscount.value} onChange={e => handleOverallDiscountChange(overallDiscount.type, Number(e.target.value))} placeholder="Discount..." />
                                                <select value={overallDiscount.type} onChange={e => handleOverallDiscountChange(e.target.value as any, overallDiscount.value)} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                                    <option value="৳">৳</option>
                                                    <option value="%">%</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Notes</label>
                                        <input type="text" value={checkoutNotes} onChange={e => setCheckoutNotes(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} placeholder="Any remarks..." />
                                    </div>
                                </div>

                                {/* Right Side: Payments */}
                                <div className={styles.checkoutRight}>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', background: isDue ? '#fee2e2' : 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                        <input type="checkbox" id="dueSaleCheck" checked={isDue} onChange={e => {
                                            setIsDue(e.target.checked);
                                            // Auto-open Customer selection if none selected when Due is clicked
                                            if (e.target.checked && !selectedCustomer) {
                                                setShowCustDropdown(true);
                                            }
                                        }} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                                        <label htmlFor="dueSaleCheck" style={{ fontWeight: 700, fontSize: '1rem', cursor: 'pointer', color: isDue ? '#991b1b' : 'inherit' }}>Due / Partial Payment</label>
                                    </div>

                                    {/* Custom Searchable Customer Dropdown */}
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Customer {isDue && <span style={{ color: '#ef4444' }}>* (Required)</span>}</label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <div ref={custDropdownRef} style={{ flex: 1, position: 'relative' }}>
                                                <div
                                                    onClick={() => setShowCustDropdown(true)}
                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                                                >
                                                    <span>{getCustomerName(selectedCustomer)}</span>
                                                    <ChevronDown size={16} />
                                                </div>

                                                {showCustDropdown && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: '4px', zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', maxHeight: '180px', display: 'flex', flexDirection: 'column' }}>
                                                        <div style={{ padding: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <Search size={14} style={{ position: 'absolute', left: '0.4rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Search..."
                                                                    value={custSearch}
                                                                    onChange={e => setCustSearch(e.target.value)}
                                                                    style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ overflowY: 'auto', flex: 1 }}>
                                                            <div
                                                                style={{ padding: '0.6rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedCustomer === null ? 'var(--background)' : 'transparent', fontSize: '0.9rem' }}
                                                                onClick={() => { setSelectedCustomer(null); setShowCustDropdown(false); }}
                                                            >
                                                                Walk-in Customer
                                                            </div>
                                                            {filteredCustomers.length === 0 ? (
                                                                <div style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>No customers found</div>
                                                            ) : (
                                                                filteredCustomers.map(c => (
                                                                    <div
                                                                        key={c.id}
                                                                        style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedCustomer === c.id ? 'var(--background)' : 'transparent' }}
                                                                        onClick={() => { setSelectedCustomer(c.id); setShowCustDropdown(false); }}
                                                                    >
                                                                        <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => setAddCustomerModal(true)} style={{ padding: '0.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer' }} title="Add New Customer">
                                                <UserPlus size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Payment Method</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                            <button onClick={() => setPaymentMethod('cash')} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: paymentMethod === 'cash' ? 'var(--primary)' : 'var(--background)', color: paymentMethod === 'cash' ? 'white' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                <Banknote size={16} /> Cash
                                            </button>
                                            <button onClick={() => setPaymentMethod('bkash')} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: paymentMethod === 'bkash' ? '#e11471' : 'var(--background)', color: paymentMethod === 'bkash' ? 'white' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                <Smartphone size={16} /> bKash
                                            </button>
                                            <button onClick={() => setPaymentMethod('nagad')} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: paymentMethod === 'nagad' ? '#f58220' : 'var(--background)', color: paymentMethod === 'nagad' ? 'white' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                <Smartphone size={16} /> Nagad
                                            </button>
                                            <button onClick={() => setPaymentMethod('card')} style={{ padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: paymentMethod === 'card' ? '#4f46e5' : 'var(--background)', color: paymentMethod === 'card' ? 'white' : 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                                                <CreditCard size={16} /> Card
                                            </button>
                                        </div>
                                    </div>

                                    {isDue && (
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Amount Paid (৳)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    value={paidAmountInput}
                                                    onChange={e => setPaidAmountInput(e.target.value ? Number(e.target.value) : '')}
                                                    style={{ width: '100%', padding: '0.5rem', paddingRight: '2.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)', fontSize: '1.1rem', fontWeight: 'bold' }}
                                                    placeholder="0"
                                                />
                                                {/* Clear to 0 button directly inside the input */}
                                                <button
                                                    onClick={() => setPaidAmountInput(0)}
                                                    style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ef4444' }}
                                                    title="Set to 0 (Full Due)"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {paymentMethod !== 'cash' && (
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Transaction / Ref ID (Optional)</label>
                                            <input type="text" value={refNo} onChange={e => setRefNo(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                                        </div>
                                    )}

                                    <div style={{ background: 'var(--surface)', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '1rem', fontWeight: 600 }}>
                                            <span>Total Paid:</span>
                                            <span>৳ {actualPaid.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: dueAmount > 0 ? '#ef4444' : '#10b981', fontSize: '1rem', fontWeight: 600 }}>
                                            <span>Due:</span>
                                            <span>৳ {dueAmount.toFixed(2)}</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                        </div>

                        <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
                            <button className={styles.completeBtn} onClick={processCheckout} disabled={processing || (isDue && !selectedCustomer)} style={{ width: '100%', padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '1.1rem', fontWeight: 600, cursor: (processing || (isDue && !selectedCustomer)) ? 'not-allowed' : 'pointer', opacity: (processing || (isDue && !selectedCustomer)) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {processing ? 'Processing...' : <><CheckCircle size={20} style={{ marginRight: 8 }} /> Confirm Sale</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUICK ADD CUSTOMER MODAL */}
            {addCustomerModal && (
                <div className={styles.modalOverlay} style={{ zIndex: 1500 }}>
                    <div className={styles.modalContent} style={{ maxWidth: 400 }}>
                        <div className={styles.modalHeader}>
                            <h2>Add New Customer</h2>
                            <button className={styles.closeBtn} onClick={() => setAddCustomerModal(false)}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name *</label>
                                <input type="text" value={newCustName} onChange={e => setNewCustName(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Phone</label>
                                <input type="text" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <button onClick={handleQuickAddCustomer} style={{ padding: '1rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}>
                                Add Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT MODAL */}
            {receiptData && (
                <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
                    <div className={styles.modalContent} style={{ maxWidth: 400 }}>
                        <div className={styles.modalHeader} style={{ marginBottom: '0' }}>
                            <h2 style={{ color: '#10b981' }}>Sale Successful!</h2>
                            <button className={styles.closeBtn} onClick={() => setReceiptData(null)}><X size={24} /></button>
                        </div>

                        <div id="receipt-print-area" style={{ background: '#fff', padding: '20px', borderRadius: '8px', color: '#000', margin: '20px 0', border: '1px solid #ccc', fontSize: '12px', fontFamily: 'monospace' }}>
                            <h2 style={{ textAlign: 'center', margin: '0 0 5px 0' }}>{receiptData.storeName}</h2>
                            {receiptData.storePhone && <div style={{ textAlign: 'center', marginBottom: '2px' }}>Phone: {receiptData.storePhone}</div>}
                            {receiptData.storeAddress && <div style={{ textAlign: 'center', marginBottom: '10px' }}>{receiptData.storeAddress}</div>}

                            <div style={{ borderBottom: '1px dashed #000', paddingBottom: '10px', marginBottom: '10px' }}>
                                <div>Invoice: {receiptData.invoiceNo}</div>
                                <div>Date: {receiptData.date}</div>
                                <div>Customer: {receiptData.customerName}</div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '10px' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px dashed #000' }}>
                                        <th style={{ padding: '5px 0' }}>Item</th>
                                        <th style={{ padding: '5px 0', textAlign: 'center' }}>Qty</th>
                                        <th style={{ padding: '5px 0', textAlign: 'right' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {receiptData.items.map((it: any, i: number) => (
                                        <tr key={i} style={{ borderBottom: '1px dashed #eee' }}>
                                            <td style={{ padding: '5px 0' }}>
                                                {it.name} {it.variant_info ? `(${it.variant_info})` : ''}
                                                {it.discount > 0 && <div style={{ fontSize: '10px' }}>(-৳{it.discount})</div>}
                                            </td>
                                            <td style={{ padding: '5px 0', textAlign: 'center' }}>{it.quantity}</td>
                                            <td style={{ padding: '5px 0', textAlign: 'right' }}>৳{((it.unit_price - it.discount) * it.quantity).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <div style={{ borderTop: '1px dashed #000', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Subtotal:</span>
                                    <span>৳ {receiptData.subtotal.toFixed(2)}</span>
                                </div>
                                {receiptData.discAmount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Discount:</span>
                                        <span>- ৳ {receiptData.discAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '5px', paddingTop: '5px', borderTop: '1px solid #000' }}>
                                    <span>Grand Total:</span>
                                    <span>৳ {receiptData.grandTotal.toFixed(2)}</span>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                                    <span>Paid ({receiptData.paymentMethod}):</span>
                                    <span>৳ {receiptData.paid.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Due:</span>
                                    <span>৳ {receiptData.due.toFixed(2)}</span>
                                </div>
                                {receiptData.change > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Change:</span>
                                        <span>৳ {receiptData.change.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '20px', fontStyle: 'italic' }}>
                                Thank you for shopping with us!
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem' }}>
                            <button onClick={printReceipt} style={{ padding: '0.75rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <Printer size={18} /> Print
                            </button>
                            <button onClick={downloadReceipt} style={{ padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <Download size={18} /> Download
                            </button>
                            <button onClick={shareReceipt} style={{ padding: '0.75rem', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                                <Share2 size={18} /> Share
                            </button>
                            <button onClick={() => setReceiptData(null)} style={{ padding: '0.75rem', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer' }}>
                                Close / New Sale
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HELD CARTS MODAL */}
            {heldListModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h2>Held Carts</h2>
                            <button className={styles.closeBtn} onClick={() => setHeldListModal(false)}><X size={24} /></button>
                        </div>
                        {heldCarts.length === 0 ? <p>No held carts.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {heldCarts.map(hc => (
                                    <div key={hc.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{hc.label}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                            {hc.cart_data.cart?.length} items • Held at {new Date(hc.created_at).toLocaleTimeString()}
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button style={{ flex: 1, padding: '0.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }} onClick={() => resumeCart(hc)}>Resume Cart</button>
                                            <button style={{ padding: '0.5rem', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer' }} onClick={async () => {
                                                await localDB.heldCarts.delete(hc.id);
                                                await supabase.from('held_carts').delete().eq('id', hc.id);
                                            }}>Delete</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
