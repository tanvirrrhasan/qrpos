'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Camera, CameraOff, Upload, X, Minus, Plus, Trash2, List, Image as ImageIcon, Tag, Printer, UserPlus, ChevronDown, ChevronUp, Package, ShoppingCart, Clock, Banknote, Smartphone, CreditCard, Building2, CheckCircle, Download, Share2, Percent } from 'lucide-react';
import styles from './pos.module.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Product, ProductVariant, HeldCart } from '@/lib/types';
import QrScanner from 'qr-scanner';
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
    const scannerRef = useRef<QrScanner | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Checkout State
    const [overallDiscount, setOverallDiscount] = useState<{ type: '%' | '৳', value: number | '' }>({ type: '৳', value: '' });
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [isDue, setIsDue] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
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
    const [newCustEmail, setNewCustEmail] = useState('');
    const [newCustAddress, setNewCustAddress] = useState('');
    const [newCustNotes, setNewCustNotes] = useState('');

    // Fetch Data
    const products = useLiveQuery(() => localDB.products.filter(p => p.is_active).toArray(), []) || [];
    const variants = useLiveQuery(() => localDB.productVariants.toArray(), []) || [];
    const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];
    const customers = useLiveQuery(() => localDB.customers.toArray(), []) || [];
    const heldCarts = useLiveQuery(() => localDB.heldCarts.toArray(), []) || [];
    const settings = useLiveQuery(() => localDB.settings.toArray(), []) || [];

    const paymentSettings = useMemo(() => {
        const s = settings.find(x => x.setting_key === 'payments');
        return s?.setting_value || { cash: true, bkash: true, nagad: true, rocket: false, bank: false, card: false };
    }, [settings]);

    const taxSetting = useMemo(() => {
        const s = settings.find(x => x.setting_key === 'tax');
        return s?.setting_value || { enabled: false, name: 'VAT', rate: 0, type: 'Exclusive' };
    }, [settings]);

    const availablePaymentMethods = useMemo(() => {
        const list = [];
        if (paymentSettings.cash !== false) list.push({ id: 'cash', label: 'Cash', icon: Banknote, activeColor: 'var(--primary)' });
        if (paymentSettings.bkash) list.push({ id: 'bkash', label: 'bKash', icon: Smartphone, activeColor: '#e11471' });
        if (paymentSettings.nagad) list.push({ id: 'nagad', label: 'Nagad', icon: Smartphone, activeColor: '#f58220' });
        if (paymentSettings.rocket) list.push({ id: 'rocket', label: 'Rocket', icon: Smartphone, activeColor: '#8c3494' });
        if (paymentSettings.bank) list.push({ id: 'bank', label: 'Bank Transfer', icon: Building2, activeColor: '#0284c7' });
        if (paymentSettings.card) list.push({ id: 'card', label: 'Card', icon: CreditCard, activeColor: '#4f46e5' });
        return list.length > 0 ? list : [{ id: 'cash', label: 'Cash', icon: Banknote, activeColor: 'var(--primary)' }];
    }, [paymentSettings]);

    useEffect(() => {
        if (availablePaymentMethods.length > 0) {
            const isCurrentValid = availablePaymentMethods.some(m => m.id === paymentMethod);
            if (!isCurrentValid) {
                setPaymentMethod(availablePaymentMethods[0].id);
            }
        }
    }, [availablePaymentMethods, paymentMethod]);

    const productsRef = useRef(products);
    useEffect(() => {
        productsRef.current = products;
    }, [products]);

    const variantsRef = useRef(variants);
    useEffect(() => {
        variantsRef.current = variants;
    }, [variants]);

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
        if (searchQ) {
            const q = searchQ.trim().toLowerCase();
            const matchName = p.name.toLowerCase().includes(q);
            const matchSku = p.sku && p.sku.toLowerCase().includes(q);
            const pVars = p.has_variants ? variants.filter(v => v.product_id === p.id) : [];
            const matchVarSku = pVars.some(v => v.sku && v.sku.toLowerCase().includes(q));
            if (!matchName && !matchSku && !matchVarSku) return false;
        }
        return true;
    });

    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && searchQ.trim()) {
            const query = searchQ.trim().toLowerCase();
            
            const matchingVariant = variants.find(v => v.sku && v.sku.toLowerCase() === query);
            if (matchingVariant) {
                const parentProduct = products.find(p => p.id === matchingVariant.product_id);
                if (parentProduct) {
                    addToCart(parentProduct, matchingVariant);
                    showToast(`Added ${parentProduct.name} (${matchingVariant.variant_value}) to cart!`, 'success');
                    setSearchQ('');
                    return;
                }
            }

            const matchingProduct = products.find(p => p.sku && p.sku.toLowerCase() === query);
            if (matchingProduct) {
                if (matchingProduct.has_variants) {
                    setVariantModal(matchingProduct);
                } else {
                    addToCart(matchingProduct);
                    showToast(`Added ${matchingProduct.name} to cart!`, 'success');
                }
                setSearchQ('');
                return;
            }
        }
    };

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
    const discNum = typeof overallDiscount.value === 'number' ? overallDiscount.value : 0;
    const rawDiscAmount = overallDiscount.type === '৳' ? discNum : (subtotal * discNum / 100);
    const discAmount = Math.round(rawDiscAmount);
    const taxableSubtotal = Math.max(0, subtotal - discAmount);

    let taxAmount = 0;
    let grandTotal = taxableSubtotal;

    if (taxSetting.enabled && Number(taxSetting.rate) > 0) {
        const rate = Number(taxSetting.rate);
        if (taxSetting.type === 'Inclusive') {
            taxAmount = Math.round(taxableSubtotal - (taxableSubtotal / (1 + (rate / 100))));
            grandTotal = taxableSubtotal;
        } else {
            taxAmount = Math.round(taxableSubtotal * (rate / 100));
            grandTotal = Math.round(taxableSubtotal + taxAmount);
        }
    } else {
        grandTotal = Math.round(taxableSubtotal);
    }

    const handleOverallDiscountChange = (type: '%' | '৳', valInput: number | '') => {
        const val = typeof valInput === 'number' ? valInput : 0;
        if (role !== 'owner') {
            const valPct = type === '%' ? val : (subtotal > 0 ? (val / subtotal) * 100 : 0);
            if (valPct > maxDiscountPct) {
                showToast(`Overall discount exceeds your allowed limit of ${maxDiscountPct}%`, 'error');
                return;
            }
        }
        setOverallDiscount({ type, value: valInput });
    };

    const actualPaid = isDue ? (Number(paidAmountInput) || 0) : grandTotal;
    const dueAmount = Math.max(0, grandTotal - actualPaid);
    const changeAmount = Math.max(0, actualPaid - grandTotal);

    // Update paid amount when toggling isDue or grandTotal changes
    useEffect(() => {
        if (!isDue) {
            setPaidAmountInput(grandTotal);
        } else {
            if (typeof paidAmountInput === 'number' && paidAmountInput > grandTotal) {
                setPaidAmountInput(grandTotal);
            }
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
        const now = new Date().toISOString();
        const newCust = {
            id: uuidv4(),
            store_id: storeId,
            name: newCustName,
            phone: newCustPhone || null,
            email: newCustEmail || null,
            address: newCustAddress || null,
            notes: newCustNotes || null,
            total_due: 0,
            total_purchases: 0,
            purchase_count: 0,
            is_active: true,
            created_at: now,
            updated_at: now
        };
        await localDB.customers.put(newCust as any);
        try {
            await supabase.from('customers').insert(newCust);
        } catch (e) { }
        setSelectedCustomer(newCust.id);
        setAddCustomerModal(false);
        setNewCustName('');
        setNewCustPhone('');
        setNewCustEmail('');
        setNewCustAddress('');
        setNewCustNotes('');
        showToast('Customer added successfully!', 'success');
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
            if (!videoRef.current) return;
            
            if (!scannerRef.current) {
                scannerRef.current = new QrScanner(
                    videoRef.current,
                    (result) => {
                        onScanSuccess(result.data);
                    },
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: false,
                        highlightCodeOutline: false,
                        maxScansPerSecond: 15,
                    }
                );
            }

            if (!isCameraActive) {
                scannerRef.current.stop();
            } else {
                try {
                    await scannerRef.current.start();
                } catch (err) {
                    console.error("Scanner error", err);
                }
            }
        });
    }, [isCameraActive]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            scannerLock.current.then(() => {
                if (scannerRef.current) {
                    scannerRef.current.stop();
                    scannerRef.current.destroy();
                    scannerRef.current = null;
                }
            });
        };
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        try {
            // Stop scanning if currently active before scanning file
            scannerLock.current = scannerLock.current.then(async () => {
                if (scannerRef.current) {
                    scannerRef.current.stop();
                    setIsCameraActive(false);
                }
            });
            await scannerLock.current;
            
            // Try different sizes to handle both huge images and different QR sizes
            const img = await createImageBitmap(file);
            let scanResult = null;
            // 1080 matches typical phone screenshot width
            const dimsToTry = [img.width, 1500, 1080, 800, 400];
            
            for (const maxDim of dimsToTry) {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxDim || height > maxDim) {
                    const ratio = Math.min(maxDim / width, maxDim / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    // Smoothing must be true to prevent pixel dropping when downscaling heavily
                    ctx.imageSmoothingEnabled = true; 
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                try {
                    const result = await QrScanner.scanImage(canvas, { 
                        returnDetailedScanResult: true,
                        alsoTryWithoutScanRegion: true
                    });
                    if (result && result.data) {
                        scanResult = result.data;
                        break;
                    }
                } catch (e) {
                    // Ignore and try next size
                }
            }

            if (scanResult) {
                onScanSuccess(scanResult);
            } else {
                throw new Error("QR code not found in any resolution");
            }
        } catch (err) {
            console.error("Upload scan error:", err);
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
            const scannedSku = result.identifier.toLowerCase();

            // 1. Check if SKU matches a specific Product Variant
            const matchingVariant = variantsRef.current.find(v => v.sku && v.sku.toLowerCase() === scannedSku);
            if (matchingVariant) {
                const parentProduct = productsRef.current.find(p => p.id === matchingVariant.product_id);
                if (parentProduct) {
                    addToCart(parentProduct, matchingVariant);
                    showToast(`Added ${parentProduct.name} (${matchingVariant.variant_value}) to cart!`, 'success');
                    return;
                }
            }

            // 2. Check if SKU matches a Main Product
            const p = productsRef.current.find(prod => prod.sku && prod.sku.toLowerCase() === scannedSku);
            if (p) {
                if (p.has_variants) {
                    setVariantModal(p);
                } else {
                    addToCart(p);
                    showToast(`Added ${p.name} to cart!`, 'success');
                }
                return;
            }

            showToast(`Product not found for SKU: ${result.identifier}`, 'error');
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
                discount_amount: discAmount, tax_amount: taxAmount, total: grandTotal,
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

            if (selectedCustomer) {
                const cust = await localDB.customers.get(selectedCustomer);
                if (cust) {
                    const newDue = Math.max(0, (cust.total_due || 0) + dueAmount);
                    const newPurchases = (cust.total_purchases || 0) + grandTotal;
                    const newCount = (cust.purchase_count || 0) + 1;
                    const now = new Date().toISOString();
                    await localDB.customers.update(cust.id, {
                        total_due: newDue,
                        total_purchases: newPurchases,
                        purchase_count: newCount,
                        last_purchase_at: now,
                        updated_at: now
                    });
                    try {
                        await supabase.from('customers').update({
                            total_due: newDue,
                            total_purchases: newPurchases,
                            purchase_count: newCount,
                            last_purchase_at: now,
                            updated_at: now
                        }).eq('id', cust.id);
                    } catch (e) {}
                }
            }

            await localDB.sales.put(saleData as any);
            await localDB.saleItems.bulkPut(items as any);
            if (payments.length) await localDB.salePayments.bulkPut(payments as any);

            // System Audit Activity Log
            const actPayload = {
                id: uuidv4(),
                store_id: storeId,
                staff_id: staffId || undefined,
                action: 'sale_created',
                entity_type: 'sale',
                entity_id: saleId,
                details: {
                    invoice_no: invNo,
                    total: grandTotal,
                    paid: actualPaid,
                    due: dueAmount,
                    customer: selectedCustomer ? getCustomerName(selectedCustomer) : 'Walk-in'
                },
                created_at: new Date().toISOString()
            };
            await localDB.activityLog.put(actPayload);

            try {
                await supabase.from('sales').insert(saleData);
                await supabase.from('sale_items').insert(items);
                if (payments.length) await supabase.from('sale_payments').insert(payments);
                await supabase.from('activity_logs').insert([actPayload]);
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
                subtotal, discAmount, taxAmount, taxName: taxSetting.name || 'VAT', taxRate: taxSetting.rate, taxType: taxSetting.type, taxEnabled: taxSetting.enabled && Number(taxSetting.rate) > 0, grandTotal,
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

            if (receiptData.taxEnabled) {
                const taxLabel = `${receiptData.taxName || 'VAT'} (${receiptData.taxRate}% ${receiptData.taxType}):`;
                const taxVal = receiptData.taxType === 'Inclusive' ? `(Incl. ৳${receiptData.taxAmount.toFixed(2)})` : `+৳${receiptData.taxAmount.toFixed(2)}`;
                svgLines.push(`<text x="15" y="${y}" font-family="monospace" font-size="11" fill="#000000">${escapeXml(taxLabel)}</text>`);
                svgLines.push(`<text x="${width - 15}" y="${y}" font-family="monospace" font-size="11" text-anchor="end" fill="#000000">${escapeXml(taxVal)}</text>`);
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

                {/* Permanent / Swappable Scanner Area */}
                <div className={styles.scannerContainer}>
                    {/* Mobile Swapped View: Search Results */}
                    {searchQ ? (
                        <div className={styles.mobileSearchResultWrapper}>
                            <div className={styles.mobileSwapHeader}>
                                <span>🔍 Search Results ({filteredProducts.length})</span>
                                <button className={styles.clearSearchBtn} onClick={() => setSearchQ('')}>Clear Search</button>
                            </div>
                            <div className={styles.mobileSearchList}>
                                {filteredProducts.length === 0 ? (
                                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                        No products found for "{searchQ}"
                                    </div>
                                ) : (
                                    filteredProducts.map(p => (
                                        <div key={p.id} className={styles.mobileSearchItem} onClick={() => {
                                            if (p.has_variants) setVariantModal(p);
                                            else addToCart(p);
                                        }}>
                                            <div className={styles.mobileItemThumb}>
                                                {p.thumbnail_url ? <img src={p.thumbnail_url} style={{ height: '100%', width: '100%', objectFit: 'cover' }} alt="" /> : <ImageIcon size={18} color="var(--text-muted)" />}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    ৳{p.selling_price} {!p.has_variants && `• Stock: ${p.stock}`}
                                                </div>
                                            </div>
                                            <button className={styles.mobileAddBtn}>+ Add</button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ) : null}

                    {/* Mobile Swapped View: Product Catalog Grid */}
                    {showMobileProducts && !searchQ ? (
                        <div className={styles.mobileCatalogWrapper}>
                            <div className={styles.categoryList} style={{ paddingBottom: '0.4rem', borderBottom: '1px solid var(--border)' }}>
                                <button className={`${styles.categoryBtn} ${activeCat === 'all' ? styles.active : ''}`} onClick={() => setActiveCat('all')}>All Items</button>
                                {categories.map(c => (
                                    <button key={c.id} className={`${styles.categoryBtn} ${activeCat === c.id ? styles.active : ''}`} onClick={() => setActiveCat(c.id)}>{c.name}</button>
                                ))}
                            </div>
                            <div className={styles.mobileGridBody}>
                                {filteredProducts.map(p => (
                                    <div key={p.id} className={`${styles.productCard} ${p.stock <= 0 && !p.has_variants ? styles.outOfStock : ''}`} onClick={() => {
                                        if (p.has_variants) setVariantModal(p);
                                        else addToCart(p);
                                    }}>
                                        {!p.has_variants && (
                                            <div className={`${styles.stockBadge} ${p.stock === 0 ? styles.stockOut : p.stock <= p.low_stock_alert ? styles.stockLow : styles.stockGood}`}>
                                                {p.stock}
                                            </div>
                                        )}
                                        <div style={{ height: 50, background: 'var(--background)', borderRadius: 'var(--radius)', marginBottom: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                            {p.thumbnail_url ? <img src={p.thumbnail_url} style={{ height: '100%', width: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color="var(--text-muted)" />}
                                        </div>
                                        <div style={{ fontWeight: 600, fontSize: '0.75rem', lineHeight: 1.1 }}>{p.name}</div>
                                        <div style={{ color: 'var(--primary)', fontWeight: 700, marginTop: 'auto', fontSize: '0.8rem' }}>৳ {p.selling_price}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}

                    {/* Standard Scanner View (Renders on Desktop always, on Mobile when not swapped) */}
                    <div className={`${styles.desktopScannerBlock} ${(searchQ || showMobileProducts) ? styles.hideScannerOnMobile : ''}`}>
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
                        {isCameraActive ? (
                            <div className={styles.scannerBody}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ width: '100%', borderRadius: 'var(--radius)', objectFit: 'cover' }}
                                ></video>
                                <div className={styles.scannerOverlay}>
                                    <div className={styles.scanRegion}>
                                        <div className={`${styles.scanCorner} ${styles.cornerTL}`} />
                                        <div className={`${styles.scanCorner} ${styles.cornerTR}`} />
                                        <div className={`${styles.scanCorner} ${styles.cornerBL}`} />
                                        <div className={`${styles.scanCorner} ${styles.cornerBR}`} />
                                        <div className={styles.scanLaser} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '0.4rem 0.75rem', background: 'var(--background)', borderRadius: 'var(--radius)', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <CameraOff size={16} />
                                <span>Camera Paused. Click "Start" to scan QR.</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky Header: Search Bar & Category Filter */}
                <div className={styles.stickySearchHeader}>
                    <div className={styles.searchBar}>
                        <input type="text" placeholder="Search by name or SKU..." value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={handleSearchKeyDown} />
                        <button
                            className={styles.mobileProductToggle}
                            onClick={() => setShowMobileProducts(!showMobileProducts)}
                            title="Toggle Product List"
                        >
                            <List size={20} />
                            {showMobileProducts ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>

                    <div className={`${styles.categoryList} ${styles.desktopOnlyCategoryList}`}>
                        <button className={`${styles.categoryBtn} ${activeCat === 'all' ? styles.active : ''}`} onClick={() => setActiveCat('all')}>All Items</button>
                        {categories.map(c => (
                            <button key={c.id} className={`${styles.categoryBtn} ${activeCat === c.id ? styles.active : ''}`} onClick={() => setActiveCat(c.id)}>{c.name}</button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className={`${styles.productGrid} ${styles.desktopOnlyProductGrid}`}>
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
                        <span>
                            Subtotal 
                            {totalCartItems > 0 && (
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '6px' }}>
                                    ({totalCartItems} {totalCartItems === 1 ? 'item' : 'items'})
                                </span>
                            )}
                        </span>
                        <span>৳ {subtotal.toFixed(2)}</span>
                    </div>
                    {discAmount > 0 && (
                        <div className={styles.summaryRow} style={{ color: '#ef4444' }}>
                            <span>Discount {overallDiscount.type === '%' && typeof overallDiscount.value === 'number' && overallDiscount.value > 0 ? `(${overallDiscount.value}%)` : ''}:</span>
                            <span>- ৳ {discAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {taxSetting.enabled && Number(taxSetting.rate) > 0 && (
                        <div className={styles.summaryRow} style={{ color: taxSetting.type === 'Inclusive' ? 'var(--text-muted)' : 'var(--primary)', fontSize: '0.85rem' }}>
                            <span>{taxSetting.name || 'VAT'} ({taxSetting.rate}% {taxSetting.type}):</span>
                            <span>{taxSetting.type === 'Inclusive' ? `(Incl. ৳${taxAmount.toFixed(2)})` : `+ ৳${taxAmount.toFixed(2)}`}</span>
                        </div>
                    )}
                    <div className={styles.summaryTotal}>
                        <span>Total Payable:</span>
                        <span style={{ color: 'var(--primary)' }}>৳ {grandTotal.toFixed(2)}</span>
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
                        Checkout (৳ {grandTotal.toFixed(0)})
                    </button>
                </div>
            </div>

            {/* VARIANT MODAL */}
            {variantModal && (
                <div className={styles.modalOverlay} style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1200 }}>
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
                <div className={styles.modalOverlay} style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1000 }}>
                    <div className={`${styles.modalContent} ${styles.checkoutModalContent}`} style={{ maxWidth: 880, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
                        <div className={styles.modalHeader} style={{ padding: '1rem 1rem 0 1rem', flexShrink: 0, marginBottom: '0.5rem' }}>
                            <h2>Complete Sale</h2>
                            <button className={styles.closeBtn} onClick={() => setCheckoutModal(false)}><X size={24} /></button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
                            <div className={styles.checkoutLayout}>

                                {/* Left Side: Summary & Discount */}
                                <div className={styles.checkoutLeft}>

                                    <div style={{ background: 'var(--background)', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                <span>Subtotal ({cart.reduce((sum, i) => sum + i.quantity, 0)} items):</span>
                                                <span style={{ fontWeight: 600 }}>৳ {subtotal.toFixed(2)}</span>
                                            </div>
                                            {discAmount > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#ef4444' }}>
                                                    <span>Discount {overallDiscount.type === '%' && typeof overallDiscount.value === 'number' && overallDiscount.value > 0 ? `(${overallDiscount.value}%)` : ''}:</span>
                                                    <span style={{ fontWeight: 600 }}>- ৳ {discAmount.toFixed(2)}</span>
                                                </div>
                                            )}
                                            {taxSetting.enabled && Number(taxSetting.rate) > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: taxSetting.type === 'Inclusive' ? 'var(--text-muted)' : 'var(--primary)' }}>
                                                    <span>{taxSetting.name || 'VAT'} ({taxSetting.rate}% {taxSetting.type}):</span>
                                                    <span style={{ fontWeight: 600 }}>{taxSetting.type === 'Inclusive' ? `(Incl. ৳${taxAmount.toFixed(2)})` : `+ ৳${taxAmount.toFixed(2)}`}</span>
                                                </div>
                                            )}
                                            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.35rem', marginTop: '0.15rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Total Payable:</span>
                                                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary)' }}>৳ {grandTotal.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {hasPermission('can_give_discount') && (
                                        <div style={{ background: 'var(--background)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>Overall Discount</label>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--surface)', fontSize: '0.95rem', color: 'var(--text)' }}
                                                    value={overallDiscount.value}
                                                    onChange={e => handleOverallDiscountChange(overallDiscount.type, e.target.value === '' ? '' : Number(e.target.value))}
                                                    placeholder="0"
                                                />
                                                <div style={{ display: 'flex', background: 'var(--surface)', padding: '3px', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOverallDiscountChange('৳', overallDiscount.value)}
                                                        style={{
                                                            width: '42px',
                                                            height: '34px',
                                                            borderRadius: 'calc(var(--radius) - 2px)',
                                                            border: 'none',
                                                            background: overallDiscount.type === '৳' ? 'var(--primary)' : 'transparent',
                                                            color: overallDiscount.type === '৳' ? 'white' : 'var(--text-muted)',
                                                            fontWeight: 800,
                                                            fontSize: '1.1rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title="Fixed Amount (৳)"
                                                    >
                                                        ৳
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOverallDiscountChange('%', overallDiscount.value)}
                                                        style={{
                                                            width: '42px',
                                                            height: '34px',
                                                            borderRadius: 'calc(var(--radius) - 2px)',
                                                            border: 'none',
                                                            background: overallDiscount.type === '%' ? 'var(--primary)' : 'transparent',
                                                            color: overallDiscount.type === '%' ? 'white' : 'var(--text-muted)',
                                                            fontWeight: 800,
                                                            fontSize: '1.1rem',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            transition: 'all 0.15s ease'
                                                        }}
                                                        title="Percentage (%)"
                                                    >
                                                        %
                                                    </button>
                                                </div>
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

                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        marginBottom: '0.75rem',
                                        background: isDue ? 'rgba(59, 130, 246, 0.12)' : 'var(--background)',
                                        border: isDue ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                                        padding: '0.75rem',
                                        borderRadius: 'var(--radius)',
                                        transition: 'all 0.2s ease'
                                    }}>
                                        <input type="checkbox" id="dueSaleCheck" checked={isDue} onChange={e => {
                                             const checked = e.target.checked;
                                             setIsDue(checked);
                                             if (checked) {
                                                 setPaidAmountInput(''); // Clear input for partial payment entry
                                                 if (!selectedCustomer) {
                                                     setShowCustDropdown(true);
                                                 }
                                             }
                                        }} style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary)' }} />
                                        <label htmlFor="dueSaleCheck" style={{ fontWeight: 700, fontSize: '1rem', cursor: 'pointer', color: isDue ? '#60a5fa' : 'var(--text)' }}>Due / Partial Payment</label>
                                    </div>

                                    {/* Custom Searchable Customer Dropdown */}
                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                                            Customer {isDue && (
                                                selectedCustomer ? (
                                                    <span style={{ color: '#10b981', fontWeight: 600, marginLeft: '4px' }}>✓ Selected</span>
                                                ) : (
                                                    <span style={{ color: '#ef4444' }}>* (Required)</span>
                                                )
                                            )}
                                        </label>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <div ref={custDropdownRef} style={{ flex: 1, position: 'relative' }}>
                                                <div
                                                    onClick={() => setShowCustDropdown(true)}
                                                    style={{
                                                        padding: '0.5rem 0.75rem',
                                                        borderRadius: 'var(--radius)',
                                                        border: isDue && !selectedCustomer
                                                            ? '1.5px solid #ef4444'
                                                            : isDue && selectedCustomer
                                                            ? '1.5px solid #10b981'
                                                            : showCustDropdown
                                                            ? '1.5px solid var(--primary)'
                                                            : '1px solid var(--border)',
                                                        background: isDue && !selectedCustomer
                                                            ? 'rgba(239, 68, 68, 0.04)'
                                                            : isDue && selectedCustomer
                                                            ? 'rgba(16, 185, 129, 0.05)'
                                                            : 'var(--background)',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <span style={{ fontWeight: selectedCustomer ? 600 : 400, color: isDue && selectedCustomer ? '#10b981' : 'inherit' }}>
                                                        {getCustomerName(selectedCustomer)}
                                                    </span>
                                                    <ChevronDown size={16} color={isDue && !selectedCustomer ? '#ef4444' : isDue && selectedCustomer ? '#10b981' : 'var(--text-muted)'} />
                                                </div>

                                                {showCustDropdown && (
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 'calc(100% + 4px)',
                                                        left: 0,
                                                        right: 0,
                                                        background: 'var(--surface)',
                                                        border: isDue ? '1.5px solid #3b82f6' : '1.5px solid var(--primary)',
                                                        borderRadius: 'var(--radius)',
                                                        zIndex: 100,
                                                        boxShadow: isDue ? '0 10px 25px -5px rgba(59, 130, 246, 0.35)' : '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                                                        maxHeight: '220px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        overflow: 'hidden'
                                                    }}>
                                                        <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)', background: 'var(--background)' }}>
                                                            <div style={{ position: 'relative' }}>
                                                                <Search size={14} style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                                                <input
                                                                    type="text"
                                                                    autoFocus
                                                                    placeholder="Search customer name or phone..."
                                                                    value={custSearch}
                                                                    onChange={e => setCustSearch(e.target.value)}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '0.45rem 0.45rem 0.45rem 1.8rem',
                                                                        border: '1px solid var(--border)',
                                                                        borderRadius: 'var(--radius)',
                                                                        fontSize: '0.85rem',
                                                                        background: 'var(--surface)',
                                                                        color: 'var(--text)'
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ overflowY: 'auto', flex: 1, background: 'var(--surface)' }}>
                                                            <div
                                                                style={{
                                                                    padding: '0.6rem 0.75rem',
                                                                    cursor: 'pointer',
                                                                    borderBottom: '1px solid var(--border)',
                                                                    background: selectedCustomer === null ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                                                    fontWeight: selectedCustomer === null ? 600 : 400,
                                                                    fontSize: '0.875rem'
                                                                }}
                                                                onClick={() => { setSelectedCustomer(null); setShowCustDropdown(false); }}
                                                            >
                                                                Walk-in Customer
                                                            </div>
                                                            {filteredCustomers.length === 0 ? (
                                                                <div style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.85rem' }}>No customers found</div>
                                                            ) : (
                                                                filteredCustomers.map(c => (
                                                                    <div
                                                                        key={c.id}
                                                                        style={{
                                                                            padding: '0.6rem 0.75rem',
                                                                            cursor: 'pointer',
                                                                            borderBottom: '1px solid var(--border)',
                                                                            background: selectedCustomer === c.id ? 'rgba(59, 130, 246, 0.18)' : 'transparent',
                                                                            borderLeft: selectedCustomer === c.id ? '3px solid var(--primary)' : '3px solid transparent'
                                                                        }}
                                                                        onClick={() => { setSelectedCustomer(c.id); setShowCustDropdown(false); }}
                                                                    >
                                                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <button onClick={() => setAddCustomerModal(true)} style={{ padding: '0.5rem 0.65rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }} title="Add New Customer">
                                                <UserPlus size={18} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Payment Method</label>
                                        {(() => {
                                            const count = availablePaymentMethods.length;
                                            let gridCols = 'repeat(3, 1fr)';
                                            if (count === 1) gridCols = '1fr';
                                            else if (count === 2 || count === 4) gridCols = 'repeat(2, 1fr)';
                                            else if (count === 3 || count === 6) gridCols = 'repeat(3, 1fr)';
                                            else if (count === 5) gridCols = 'repeat(6, 1fr)';

                                            return (
                                                <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: '0.4rem' }}>
                                                    {availablePaymentMethods.map((m, idx) => {
                                                        const IconComponent = m.icon;
                                                        const isActive = paymentMethod === m.id;
                                                        let itemSpan = undefined;
                                                        if (count === 5) {
                                                            itemSpan = idx < 3 ? 'span 2' : 'span 3';
                                                        }
                                                        return (
                                                            <button
                                                                key={m.id}
                                                                onClick={() => setPaymentMethod(m.id)}
                                                                style={{
                                                                    gridColumn: itemSpan,
                                                                    padding: '0.6rem 0.35rem',
                                                                    borderRadius: 'var(--radius)',
                                                                    border: '1px solid var(--border)',
                                                                    background: isActive ? m.activeColor : 'var(--background)',
                                                                    color: isActive ? 'white' : 'var(--text)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    gap: '0.35rem',
                                                                    fontWeight: 600,
                                                                    fontSize: '0.85rem',
                                                                    whiteSpace: 'nowrap',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                <IconComponent size={15} style={{ flexShrink: 0 }} /> <span>{m.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {isDue && (
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>Amount Paid (৳)</label>
                                            <div style={{ position: 'relative' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={grandTotal}
                                                    value={paidAmountInput}
                                                    onChange={e => {
                                                        const raw = e.target.value;
                                                        if (raw === '') {
                                                            setPaidAmountInput('');
                                                            return;
                                                        }
                                                        let val = Number(raw);
                                                        if (val < 0) val = 0;
                                                        if (val > grandTotal) {
                                                            val = grandTotal;
                                                            showToast(`Amount paid cannot exceed total payable (৳${grandTotal.toFixed(2)})`, 'error');
                                                        }
                                                        setPaidAmountInput(val);
                                                    }}
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

                                    <div style={{ background: 'var(--surface)', padding: '0.85rem 1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.95rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Total Paid:</span>
                                            <span>৳ {actualPaid.toFixed(2)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: dueAmount > 0 ? '#ef4444' : '#10b981', flexWrap: 'nowrap' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>Due Remaining:</span>
                                            <span style={{ fontSize: '1.05rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{dueAmount > 0 ? `৳ ${dueAmount.toFixed(2)}` : '৳ 0.00 (Paid in Full)'}</span>
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
                <div className={styles.modalOverlay} style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 1500 }}>
                    <div className={styles.modalContent} style={{ maxWidth: 400 }}>
                        <div className={styles.modalHeader}>
                            <h2>Add New Customer</h2>
                            <button className={styles.closeBtn} onClick={() => setAddCustomerModal(false)}><X size={24} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>Name *</label>
                                <input type="text" placeholder="Customer Name" value={newCustName} onChange={e => setNewCustName(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>Phone</label>
                                <input type="text" placeholder="017xxxxxxxx" value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>Email (Optional)</label>
                                <input type="email" placeholder="customer@example.com" value={newCustEmail} onChange={e => setNewCustEmail(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>Address (Optional)</label>
                                <input type="text" placeholder="House/Street/City" value={newCustAddress} onChange={e => setNewCustAddress(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>Notes (Optional)</label>
                                <input type="text" placeholder="VIP customer, discount preference, etc." value={newCustNotes} onChange={e => setNewCustNotes(e.target.value)} style={{ width: '100%', padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--background)' }} />
                            </div>
                            <button onClick={handleQuickAddCustomer} style={{ padding: '0.85rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem' }}>
                                Add Customer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RECEIPT MODAL */}
            {receiptData && (
                <div className={styles.modalOverlay} style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'rgba(15, 23, 42, 0.55)', zIndex: 2000 }}>
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
