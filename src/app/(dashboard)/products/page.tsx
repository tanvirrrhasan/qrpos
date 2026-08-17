'use client'

import Link from 'next/link';
import { Plus, Search, Filter, Edit, Trash, QrCode, Image as ImageIcon } from 'lucide-react';
import styles from './products.module.css';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDB } from '@/lib/db/local';
import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/contexts/AuthContext';

export default function ProductsPage() {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('active');
  const [variantFilter, setVariantFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Fetch from Dexie
  const products = useLiveQuery(() => localDB.products.toArray(), []) || [];
  const categories = useLiveQuery(() => localDB.categories.toArray(), []) || [];

  // Filter logic
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.is_active : !p.is_active);
      const matchVariant = variantFilter === 'all' || (variantFilter === 'yes' ? p.has_variants : !p.has_variants);
      
      let matchStock = true;
      if (stockFilter === 'in_stock') matchStock = p.stock > p.low_stock_alert;
      if (stockFilter === 'low_stock') matchStock = p.stock > 0 && p.stock <= p.low_stock_alert;
      if (stockFilter === 'out_stock') matchStock = p.stock === 0;

      return matchSearch && matchCategory && matchStatus && matchVariant && matchStock;
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [products, searchTerm, categoryFilter, stockFilter, statusFilter, variantFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === currentProducts.length && currentProducts.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentProducts.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleDelete = async (id: string) => {
    if(!confirm("এই পণ্যটি নিষ্ক্রিয় করা হবে। পুরানো বিক্রির record গুলোতে এটি দেখা যাবে। নিশ্চিত?")) return;
    try {
        const { error } = await supabase.from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
        await localDB.products.update(id, { is_active: false });
        // Deselect if selected
        if(selectedIds.has(id)) toggleSelect(id);
    } catch (err: any) {
        alert("Failed to delete: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if(selectedIds.size === 0) return;
    if(!confirm(`নির্বাচিত ${selectedIds.size} টি পণ্য নিষ্ক্রিয় করা হবে। নিশ্চিত?`)) return;
    
    const ids = Array.from(selectedIds);
    try {
        for(const id of ids) {
            await supabase.from('products').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', id);
            await localDB.products.update(id, { is_active: false });
        }
        setSelectedIds(new Set());
    } catch (err: any) {
        alert("Bulk delete failed: " + err.message);
    }
  };

  const getCategoryName = (id?: string) => {
      if(!id) return 'Uncategorized';
      return categories.find(c => c.id === id)?.name || 'Uncategorized';
  };

  return (
    <div className={styles.productsPage}>
      <div className={styles.header}>
        <h1>Products</h1>
        {hasPermission('can_add_edit_products') && (
            <Link href="/products/add" className={styles.addButton}>
              <Plus size={20} />
              <span>Add Product</span>
            </Link>
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarRow}>
            <div className={styles.searchBar}>
                <Search size={20} className={styles.searchIcon} />
                <input 
                    type="text" 
                    placeholder="Search by name or SKU..." 
                    value={searchTerm}
                    onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
                />
            </div>
            {selectedIds.size > 0 && (
                <div className={styles.bulkActions}>
                    <span style={{fontSize: '0.875rem', fontWeight: 500}}>{selectedIds.size} selected</span>
                    {hasPermission('can_add_edit_products') && (
                        <>
                            <button className={styles.bulkBtn}>Change Category</button>
                            <button className={styles.bulkBtn}>Update Price</button>
                        </>
                    )}
                    <button className={styles.bulkBtn}>Print QR</button>
                    {hasPermission('can_delete_products') && (
                        <button className={`${styles.bulkBtn} ${styles.bulkDelete}`} onClick={handleBulkDelete}>Delete</button>
                    )}
                </div>
            )}
        </div>
        <div className={styles.filters}>
          <select className={styles.filterSelect} value={categoryFilter} onChange={e => {setCategoryFilter(e.target.value); setCurrentPage(1);}}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={styles.filterSelect} value={stockFilter} onChange={e => {setStockFilter(e.target.value); setCurrentPage(1);}}>
            <option value="all">All Stock Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_stock">Out of Stock</option>
          </select>
          <select className={styles.filterSelect} value={statusFilter} onChange={e => {setStatusFilter(e.target.value); setCurrentPage(1);}}>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
            <option value="all">All Status</option>
          </select>
          <select className={styles.filterSelect} value={variantFilter} onChange={e => {setVariantFilter(e.target.value); setCurrentPage(1);}}>
            <option value="all">Variants (Any)</option>
            <option value="yes">Has Variants</option>
            <option value="no">No Variants</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{width: '40px'}}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === currentProducts.length && currentProducts.length > 0} 
                    onChange={toggleSelectAll} 
                  />
              </th>
              <th>Product Info</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Buy Price</th>
              <th>Sell Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.length === 0 ? (
              <tr>
                <td colSpan={9} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                  No products found matching filters.
                </td>
              </tr>
            ) : null}
            
            {currentProducts.map(product => (
              <tr key={product.id}>
                <td data-label="Select">
                    <input 
                        type="checkbox" 
                        checked={selectedIds.has(product.id)}
                        onChange={() => toggleSelect(product.id)}
                    />
                </td>
                <td data-label="Product Info">
                  <div className={styles.productInfo}>
                    <div className={styles.thumbnail}>
                        {product.thumbnail_url ? <img src={product.thumbnail_url} alt="img" /> : <ImageIcon size={20} color="var(--text-muted)"/>}
                    </div>
                    <div>
                      <p className={styles.productName}>{product.name}</p>
                      <span className={styles.productBrand}>{product.brand || 'No Brand'}</span>
                    </div>
                  </div>
                </td>
                <td data-label="SKU">{product.sku || '-'}</td>
                <td data-label="Category"><span style={{fontSize: '0.875rem'}}>{getCategoryName(product.category_id)}</span></td>
                <td data-label="Buy Price">৳ {product.purchase_price}</td>
                <td data-label="Sell Price">৳ {product.selling_price}</td>
                <td data-label="Stock">
                  <span className={`${styles.stockBadge} ${product.stock === 0 ? styles.stockOut : product.stock <= product.low_stock_alert ? styles.stockLow : styles.stockGood}`}>
                    {product.stock} {product.unit} {product.has_variants ? '(Variants)' : ''}
                  </span>
                </td>
                <td data-label="Status">
                  {product.is_active ? 
                    <span className={styles.statusActive}>Active</span> : 
                    <span className={styles.statusInactive}>Inactive</span>
                  }
                </td>
                <td data-label="Actions">
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} title="Print QR"><QrCode size={18} /></button>
                    {hasPermission('can_add_edit_products') && (
                        <>
                            <Link href={`/products/edit/${product.id}`} className={styles.actionBtn} title="Edit"><Edit size={18} /></Link>
                            {product.is_active && (
                                <button className={styles.actionBtn} title="Delete" onClick={() => handleDelete(product.id)}>
                                    <Trash size={18} style={{color: 'var(--danger)'}} />
                                </button>
                            )}
                        </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {totalPages > 1 && (
            <div className={styles.pagination}>
                <span style={{fontSize: '0.875rem', color: 'var(--text-muted)'}}>
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} entries
                </span>
                <div className={styles.pageControls}>
                    <button className={styles.pageBtn} disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                    <span style={{padding: '0.25rem 0.5rem'}}>{currentPage} / {totalPages}</span>
                    <button className={styles.pageBtn} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
