'use client'

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, UploadCloud, Trash2 } from 'lucide-react';
import styles from '../../add/addProduct.module.css'; // Reusing CSS
import { supabase } from '@/lib/supabase/client';
import { localDB } from '@/lib/db/local';
import { v4 as uuidv4 } from 'uuid';
import { useLiveQuery } from 'dexie-react-hooks';
import { processImage } from '@/lib/imageHandler';
import { useAuth } from '@/lib/contexts/AuthContext';
const PRODUCT_UNITS = [
    { value: 'pcs', label: 'পিস (Pieces)' },
    { value: 'kg', label: 'কেজি (Kilogram)' },
    { value: 'g', label: 'গ্রাম (Gram)' },
    { value: 'liter', label: 'লিটার (Liter)' },
    { value: 'ml', label: 'মিলিলিটার (Milliliter)' },
    { value: 'packet', label: 'প্যাকেট (Packet)' },
    { value: 'dozen', label: 'ডজন (Dozen)' },
    { value: 'box', label: 'বক্স (Box)' },
    { value: 'pair', label: 'জোড়া (Pair)' },
    { value: 'meter', label: 'মিটার (Meter)' },
    { value: 'feet', label: 'ফুট (Feet)' },
    { value: 'bag', label: 'বস্তা (Bag)' },
    { value: 'bottle', label: 'বোতল (Bottle)' },
    { value: 'can', label: 'ক্যান (Can)' },
    { value: 'roll', label: 'রোল (Roll)' },
    { value: 'set', label: 'সেট (Set)' },
];

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [storeId, setStoreId] = useState<string | null>(null);
    const { profile } = useAuth();
    const staffId = profile?.id || null;
    const [saving, setSaving] = useState(false);
    const [hasVariants, setHasVariants] = useState(false);
    
    const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];
    const product = useLiveQuery(() => localDB.products.get(id), [id]);
    const productVariants = useLiveQuery(() => localDB.productVariants.where('product_id').equals(id).toArray(), [id]);

    const [form, setForm] = useState({
        name: '',
        sku: '',
        category_id: '',
        purchase_price: 0,
        selling_price: 0,
        stock: 0,
        unit: 'pcs',
        low_stock_alert: 5,
        brand: '',
        description: '',
        image_url: '',
        thumbnail_url: ''
    });

    const [mainImageBlob, setMainImageBlob] = useState<Blob | null>(null);

    const [variants, setVariants] = useState([{ id: uuidv4(), value: '', purchase_price: 0, selling_price: 0, stock: 0, sku: '' }]);
    const [variantType, setVariantType] = useState('Size');

    useEffect(() => {
        async function fetchStore() {
            const { data } = await supabase.rpc('get_auth_store_id');
            if (data) setStoreId(data);
        }
        fetchStore();
    }, []);

    useEffect(() => {
        if (product) {
            setForm({
                name: product.name,
                sku: product.sku || '',
                category_id: product.category_id || '',
                purchase_price: product.purchase_price || 0,
                selling_price: product.selling_price || 0,
                stock: product.stock || 0,
                unit: product.unit || 'pcs',
                low_stock_alert: product.low_stock_alert || 5,
                brand: product.brand || '',
                description: product.description || '',
                image_url: product.image_url || '',
                thumbnail_url: product.thumbnail_url || ''
            });
            setHasVariants(product.has_variants || false);
        }
        if (productVariants && productVariants.length > 0) {
            setVariantType(productVariants[0].variant_type || 'Size');
            setVariants(productVariants.map(v => ({
                id: v.id,
                value: v.variant_value,
                purchase_price: v.purchase_price || 0,
                selling_price: v.selling_price || 0,
                stock: v.stock || 0,
                sku: v.sku || ''
            })));
        }
    }, [product, productVariants]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return alert('Must be an image file.');
        
        try {
            const { mainImageBlob, thumbnailBase64 } = await processImage(file);
            setMainImageBlob(mainImageBlob);
            setForm(prev => ({ ...prev, thumbnail_url: thumbnailBase64 }));
        } catch (err) {
            console.error('Image processing failed:', err);
            alert('Failed to process image');
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!storeId) return alert('Store ID missing. Please login again.');
        if (!form.name || form.name.length < 2) return alert('Product name must be at least 2 characters.');
        if (!form.category_id) return alert('Please select a category.');
        if (!hasVariants && form.selling_price < form.purchase_price) {
            if (!confirm('Selling price is lower than purchase price. Continue?')) return;
        }

        if (product && form.purchase_price !== product.purchase_price) {
            if (!confirm('ক্রয়মূল্য বদলালে পুরানো sales report এর profit হিসাব বদলাবে না (snapshot আছে)। Continue?')) return;
        }

        setSaving(true);
        try {
            let finalImageUrl = form.image_url;
            if (mainImageBlob && navigator.onLine) {
                const fileName = `${storeId}/${id}-${Date.now()}.webp`;
                const { data, error: uploadErr } = await supabase.storage.from('product-images').upload(fileName, mainImageBlob, {
                    contentType: 'image/webp',
                    upsert: true
                });
                if (!uploadErr && data) {
                    const { data: pubData } = supabase.storage.from('product-images').getPublicUrl(data.path);
                    finalImageUrl = pubData.publicUrl;
                }
            }

            const productPayload = {
                category_id: form.category_id,
                name: form.name,
                description: form.description,
                sku: form.sku,
                brand: form.brand,
                unit: form.unit,
                purchase_price: hasVariants ? 0 : form.purchase_price,
                selling_price: hasVariants ? 0 : form.selling_price,
                stock: hasVariants ? 0 : form.stock, // In real app, changing stock directly from here is bad practice, but we do it per form logic
                low_stock_alert: form.low_stock_alert,
                has_variants: hasVariants,
                image_url: finalImageUrl,
                thumbnail_url: form.thumbnail_url,
                updated_at: new Date().toISOString()
            };

            // 1. Update Product
            const { error: pErr } = await supabase.from('products').update(productPayload).eq('id', id);
            if (pErr) throw pErr;
            await localDB.products.update(id, productPayload as any);

            // Log activity
            await supabase.from('activity_log').insert({
                store_id: storeId, staff_id: staffId, action: 'edit_product', entity_type: 'products', entity_id: id, details: { changed_fields: Object.keys(productPayload) }
            });

            // 2. Save Variants (Simple diff strategy: delete all old variants and insert new ones, though not ideal for stock. Better to upsert.)
            if (hasVariants) {
                // Upsert logic
                for (const v of variants) {
                    if (!v.value) continue;
                    const variantSku = v.sku || `${form.sku}-${v.value.toUpperCase().replace(/\s+/g, '')}`;
                    
                    const varPayload = {
                        id: v.id, // Reusing existing ID if present
                        store_id: storeId,
                        product_id: id,
                        variant_type: variantType,
                        variant_value: v.value,
                        sku: variantSku,
                        purchase_price: v.purchase_price,
                        selling_price: v.selling_price,
                        stock: v.stock,
                        is_active: true,
                        updated_at: new Date().toISOString()
                    };
                    
                    const existing = productVariants?.find(pv => pv.id === v.id);
                    if (existing) {
                        await supabase.from('product_variants').update(varPayload).eq('id', v.id);
                        await localDB.productVariants.update(v.id, varPayload as any);
                    } else {
                        await supabase.from('product_variants').insert({...varPayload, created_at: new Date().toISOString()});
                        await localDB.productVariants.put({...varPayload, created_at: new Date().toISOString()} as any);
                    }
                }
            }

            alert('Product updated successfully!');
            router.push('/products');
        } catch (err: any) {
            console.error(err);
            alert('Failed to update product: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!product) return <div style={{padding: '2rem'}}>Loading...</div>;

    return (
        <form onSubmit={handleSave} className={styles.addContainer}>
            <div className={styles.header}>
                <div style={{display:'flex', alignItems:'center', gap:'1rem'}}>
                    <Link href="/products" className={styles.backBtn}><ArrowLeft size={18} /> Back</Link>
                    <h1>Edit Product</h1>
                </div>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                    <Save size={20} /> {saving ? 'Saving...' : 'Update Product'}
                </button>
            </div>

            <div className={styles.formGrid}>
                {/* Left Column */}
                <div className={styles.card}>
                    <h2>Primary Information</h2>
                    
                    <div className={styles.formGroup}>
                        <label>পণ্যের নাম (Product Name) <span className={styles.required}>*</span></label>
                        <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required minLength={2} />
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>SKU / কোড</label>
                            <input type="text" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} disabled />
                            <small style={{color: 'var(--text-muted)'}}>SKU cannot be changed.</small>
                        </div>
                        <div className={styles.formGroup}>
                            <label>ক্যাটেগরি (Category) <span className={styles.required}>*</span></label>
                            <select value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required>
                                <option value="">Select Category...</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>ক্রয়মূল্য (Buy Price) <span className={styles.required}>*</span></label>
                            <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: Number(e.target.value)})} required disabled={hasVariants} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>বিক্রয়মূল্য (Sell Price) <span className={styles.required}>*</span></label>
                            <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: Number(e.target.value)})} required disabled={hasVariants} />
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.formGroup}>
                            <label>বর্তমান স্টক (Current Stock) <span className={styles.required}>*</span></label>
                            <input type="number" min="0" value={form.stock} onChange={e => setForm({...form, stock: Number(e.target.value)})} required disabled={hasVariants} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>ইউনিট (Unit) <span className={styles.required}>*</span></label>
                            <select value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                                {PRODUCT_UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Low Stock Alert</label>
                            <input type="number" min="0" value={form.low_stock_alert} onChange={e => setForm({...form, low_stock_alert: Number(e.target.value)})} />
                        </div>
                    </div>

                    <div className={styles.variantsSection}>
                        <label className={styles.toggleLabel}>
                            <input type="checkbox" checked={hasVariants} onChange={e => setHasVariants(e.target.checked)} />
                            Has Variations? (Size, Color, etc.)
                        </label>
                        
                        {hasVariants && (
                            <div style={{marginTop: '1.5rem'}}>
                                <div className={styles.formGroup}>
                                    <label>Variation Type</label>
                                    <input type="text" value={variantType} onChange={e => setVariantType(e.target.value)} />
                                </div>
                                <table className={styles.variantTable}>
                                    <thead>
                                        <tr>
                                            <th>Value</th>
                                            <th>Buy ৳</th>
                                            <th>Sell ৳</th>
                                            <th>Stock</th>
                                            <th>SKU</th>
                                            <th style={{width: 50}}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variants.map((v, i) => (
                                            <tr key={v.id}>
                                                <td><input type="text" value={v.value} onChange={e => { const nv = [...variants]; nv[i].value = e.target.value; setVariants(nv); }} required /></td>
                                                <td><input type="number" value={v.purchase_price} onChange={e => { const nv = [...variants]; nv[i].purchase_price = Number(e.target.value); setVariants(nv); }} required min={0} /></td>
                                                <td><input type="number" value={v.selling_price} onChange={e => { const nv = [...variants]; nv[i].selling_price = Number(e.target.value); setVariants(nv); }} required min={0} /></td>
                                                <td><input type="number" value={v.stock} onChange={e => { const nv = [...variants]; nv[i].stock = Number(e.target.value); setVariants(nv); }} required min={0} /></td>
                                                <td><input type="text" value={v.sku} onChange={e => { const nv = [...variants]; nv[i].sku = e.target.value; setVariants(nv); }} /></td>
                                                <td>
                                                    <button type="button" onClick={() => setVariants(variants.filter(x => x.id !== v.id))} style={{background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer'}}>
                                                        <Trash2 size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button type="button" className={styles.addVariantBtn} onClick={() => setVariants([...variants, { id: uuidv4(), value: '', purchase_price: 0, selling_price: 0, stock: 0, sku: '' }])}>
                                    + Add Variant
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.card}>
                    <h2>Optional Information</h2>
                    
                    <div className={styles.formGroup}>
                        <label>ছবি (Image)</label>
                        <div className={styles.imageUploadBox} style={{ position: 'relative', overflow: 'hidden' }}>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageChange}
                                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                            />
                            {form.thumbnail_url ? (
                                <img src={form.thumbnail_url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                                <>
                                    <UploadCloud size={32} />
                                    <span>Click to upload image</span>
                                    <span style={{fontSize: '0.75rem'}}>Max size 500KB (WebP/JPEG)</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label>ব্র্যান্ড (Brand)</label>
                        <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="e.g. Unilever" />
                    </div>

                    <div className={styles.formGroup}>
                        <label>বিবরণ (Description)</label>
                        <textarea rows={5} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Short description of the product..."></textarea>
                    </div>
                </div>
            </div>
            
            <div className={styles.saveAction}>
                <button type="submit" className={styles.saveBtn} disabled={saving}>
                    <Save size={20} /> {saving ? 'Saving...' : 'Update Product'}
                </button>
            </div>
        </form>
    );
}
