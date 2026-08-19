'use client'

import React, { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { MapPin, Phone, Box, Image as ImageIcon } from 'lucide-react';

function PublicProductContent() {
    const searchParams = useSearchParams();
    const sku = searchParams.get('sku') as string;

    const [productData, setProductData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchPublicProduct() {
            if (!sku) return;
            const cleanSku = sku.trim();
            try {
                // 1. Call the secure RPC function that bypasses RLS safely on Supabase Cloud
                const { data, error: rpcError } = await supabase.rpc('get_public_product_by_sku', { p_sku: cleanSku });
                
                if (!rpcError && data) {
                    setProductData(data);
                    return;
                }

                // 2. Fallback to Local DB (IndexedDB) if browsing locally or synced locally
                try {
                    const { localDB } = await import('@/lib/db/local');
                    const localProd = await localDB.products.where('sku').equalsIgnoreCase(cleanSku).first();
                    if (localProd) {
                        const storeSettings = await localDB.settings.toArray();
                        const bizInfo = storeSettings.find(s => s.setting_key === 'business_info')?.setting_value || {};
                        setProductData({
                            id: localProd.id,
                            name: localProd.name,
                            sku: localProd.sku,
                            description: localProd.description,
                            selling_price: localProd.selling_price,
                            thumbnail_url: localProd.image_url || null,
                            has_variants: localProd.has_variants,
                            store_name: bizInfo.name || 'QRPOS Store',
                            store_phone: bizInfo.phone || '',
                            store_address: bizInfo.address || ''
                        });
                        return;
                    }

                    // Check variant in localDB
                    const localVar = await localDB.productVariants.where('sku').equalsIgnoreCase(cleanSku).first();
                    if (localVar) {
                        const parent = await localDB.products.get(localVar.product_id);
                        const storeSettings = await localDB.settings.toArray();
                        const bizInfo = storeSettings.find(s => s.setting_key === 'business_info')?.setting_value || {};
                        setProductData({
                            id: localVar.id,
                            name: parent ? `${parent.name} (${localVar.variant_value})` : localVar.variant_value,
                            sku: localVar.sku,
                            description: parent?.description,
                            selling_price: localVar.selling_price,
                            thumbnail_url: parent?.image_url || null,
                            has_variants: false,
                            store_name: bizInfo.name || 'QRPOS Store',
                            store_phone: bizInfo.phone || '',
                            store_address: bizInfo.address || ''
                        });
                        return;
                    }
                } catch (e) {
                    console.log('Local fallback error', e);
                }

                throw new Error('Product not found or waiting for Cloud Sync');
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Failed to load product');
            } finally {
                setLoading(false);
            }
        }
        fetchPublicProduct();
    }, [sku]);

    if (loading) {
        return (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc'}}>
                <div style={{fontSize: '1.25rem', color: 'var(--text-muted)'}}>Loading product details...</div>
            </div>
        );
    }

    if (error || !productData) {
        return (
            <div style={{display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8fafc', padding: '2rem', textAlign: 'center'}}>
                <Box size={48} color="#94a3b8" style={{marginBottom: '1rem'}} />
                <h1 style={{fontSize: '1.5rem', color: '#1e293b', marginBottom: '0.5rem'}}>Product Not Found</h1>
                <p style={{color: '#64748b'}}>The QR code you scanned is invalid or the product is no longer available.</p>
            </div>
        );
    }

    return (
        <div style={{minHeight: '100vh', background: '#f8fafc', padding: '0', fontFamily: 'system-ui, sans-serif'}}>
            {/* Header / Store Name */}
            <div style={{background: 'var(--primary)', color: 'white', padding: '1.5rem 1rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}}>
                <h1 style={{fontSize: '1.5rem', fontWeight: 800, margin: 0}}>{productData.store_name}</h1>
                <p style={{opacity: 0.9, fontSize: '0.9rem', margin: '0.25rem 0 0 0'}}>Verified Retailer</p>
            </div>

            <div style={{maxWidth: '600px', margin: '0 auto', padding: '1.5rem'}}>
                
                {/* Image Section */}
                <div style={{background: 'white', borderRadius: '1rem', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'center', alignItems: 'center', aspectRatio: '1/1'}}>
                    {productData.thumbnail_url ? (
                        <img src={productData.thumbnail_url} alt={productData.name} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                    ) : (
                        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#cbd5e1'}}>
                            <ImageIcon size={64} />
                            <span style={{marginTop: '0.5rem'}}>No image available</span>
                        </div>
                    )}
                </div>

                {/* Product Details */}
                <div style={{background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem'}}>
                    <h2 style={{fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', margin: '0 0 1rem 0'}}>{productData.name}</h2>
                    
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0', marginBottom: '1rem'}}>
                        <div>
                            <div style={{color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem'}}>PRICE</div>
                            <div style={{fontSize: '2rem', fontWeight: 800, color: 'var(--primary)'}}>৳ {productData.selling_price}</div>
                        </div>
                        <div style={{textAlign: 'right'}}>
                            <div style={{color: '#64748b', fontSize: '0.85rem', marginBottom: '0.25rem'}}>SKU</div>
                            <div style={{fontSize: '1rem', fontWeight: 600, color: '#334155'}}>{productData.sku}</div>
                        </div>
                    </div>

                    {productData.description && (
                        <div>
                            <div style={{color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600}}>DESCRIPTION</div>
                            <p style={{color: '#334155', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap'}}>{productData.description}</p>
                        </div>
                    )}
                </div>

                {/* Store Contact */}
                <div style={{background: 'white', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)'}}>
                    <h3 style={{fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0'}}>Store Information</h3>
                    
                    <div style={{display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1rem'}}>
                        <MapPin size={20} color="#64748b" style={{flexShrink: 0, marginTop: '2px'}} />
                        <span style={{color: '#334155', lineHeight: 1.4}}>{productData.store_address || 'Address not provided'}</span>
                    </div>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        <Phone size={20} color="#64748b" style={{flexShrink: 0}} />
                        <a href={`tel:${productData.store_phone}`} style={{color: 'var(--primary)', fontWeight: 600, textDecoration: 'none'}}>
                            {productData.store_phone || 'Phone not provided'}
                        </a>
                    </div>
                </div>

            </div>
        </div>
    );
}

export default function PublicProductPage() {
    return (
        <Suspense fallback={<div style={{padding: '2rem'}}>Loading...</div>}>
            <PublicProductContent />
        </Suspense>
    );
}
