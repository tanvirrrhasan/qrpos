'use client'

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { Search, Printer, CheckSquare, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QRManagementPage() {
    const router = useRouter();
    const products = useLiveQuery(() => localDB.products.toArray(), []) || [];
    const [searchQ, setSearchQ] = useState('');
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQ.toLowerCase()) || 
        p.sku.toLowerCase().includes(searchQ.toLowerCase())
    );

    const handleSelectAll = () => {
        if (selectedIds.length === filteredProducts.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredProducts.map(p => p.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handlePrintSelected = () => {
        if (selectedIds.length === 0) return alert('Select at least one product to print');
        // Store selected IDs in sessionStorage or pass via query params
        sessionStorage.setItem('qr_print_ids', JSON.stringify(selectedIds));
        router.push('/qr/print');
    };

    return (
        <div style={{padding: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
                <div>
                    <h1 style={{fontSize: '2rem', fontWeight: 800}}>QR Management</h1>
                    <p style={{color: 'var(--text-muted)'}}>Select products to generate and print QR labels</p>
                </div>
                <button 
                    onClick={handlePrintSelected}
                    style={{display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: 'var(--radius)', border: 'none', cursor: 'pointer', fontWeight: 600, opacity: selectedIds.length === 0 ? 0.5 : 1}}
                    disabled={selectedIds.length === 0}
                >
                    <Printer size={20} /> Print Selected ({selectedIds.length})
                </button>
            </div>

            <div style={{background: 'var(--surface)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1rem'}}>
                <div style={{position: 'relative', width: '300px'}}>
                    <Search size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
                    <input 
                        type="text" 
                        placeholder="Search by name or SKU..." 
                        value={searchQ}
                        onChange={e => setSearchQ(e.target.value)}
                        style={{width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)'}}
                    />
                </div>
            </div>

            <div style={{background: 'var(--surface)', borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--border)'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left'}}>
                    <thead>
                        <tr style={{background: 'var(--background)', borderBottom: '1px solid var(--border)'}}>
                            <th style={{padding: '1rem', width: '50px'}}>
                                <button onClick={handleSelectAll} style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)'}}>
                                    {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                                </button>
                            </th>
                            <th style={{padding: '1rem'}}>Product Name</th>
                            <th style={{padding: '1rem'}}>SKU</th>
                            <th style={{padding: '1rem'}}>Stock</th>
                            <th style={{padding: '1rem'}}>Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map(p => (
                            <tr key={p.id} style={{borderBottom: '1px solid var(--border)'}}>
                                <td style={{padding: '1rem'}}>
                                    <button onClick={() => toggleSelect(p.id)} style={{background: 'none', border: 'none', cursor: 'pointer', color: selectedIds.includes(p.id) ? 'var(--primary)' : 'var(--text)'}}>
                                        {selectedIds.includes(p.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                </td>
                                <td style={{padding: '1rem', fontWeight: 600}}>{p.name}</td>
                                <td style={{padding: '1rem', color: 'var(--text-muted)'}}>{p.sku}</td>
                                <td style={{padding: '1rem'}}>
                                    <span style={{
                                        padding: '0.2rem 0.6rem', 
                                        borderRadius: '12px', 
                                        fontSize: '0.85rem', 
                                        fontWeight: 600,
                                        background: p.stock <= (p.low_stock_alert || 5) ? '#fef2f2' : '#f0fdf4',
                                        color: p.stock <= (p.low_stock_alert || 5) ? '#ef4444' : '#16a34a'
                                    }}>
                                        {p.stock} {p.unit || 'pcs'}
                                    </span>
                                </td>
                                <td style={{padding: '1rem'}}>৳ {p.selling_price}</td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'}}>No products found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
