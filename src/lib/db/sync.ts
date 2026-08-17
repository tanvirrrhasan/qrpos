import { supabase } from '../supabase/client';
import { localDB } from './local';
import type { Product, Category, Customer } from '../types';

export async function syncInitialData() {
  try {
    // Ensure the user is linked to their staff record
    const { error: linkErr } = await supabase.rpc('link_auth_user');
    if (linkErr) console.error('Link Auth Error:', linkErr);

    // 1. Fetch Categories
    const { data: categories, error: catErr } = await supabase.from('categories').select('*');
    if (catErr) console.error('Categories Error:', catErr);
    if (categories && categories.length > 0) {
      await localDB.categories.bulkPut(categories as Category[]);
    }

    // 2. Fetch Products
    const { data: products, error: prodErr } = await supabase.from('products').select('*');
    if (prodErr) console.error('Products Error:', prodErr);
    if (products && products.length > 0) {
      await localDB.products.bulkPut(products as Product[]);
    }

    // 3. Fetch Customers
    const { data: customers, error: custErr } = await supabase.from('customers').select('*');
    if (custErr) console.error('Customers Error:', custErr);
    if (customers && customers.length > 0) {
      await localDB.customers.bulkPut(customers as Customer[]);
    }

    // 4. Fetch Suppliers
    const { data: suppliers, error: supErr } = await supabase.from('suppliers').select('*');
    if (supErr) console.error('Suppliers Error:', supErr);
    if (suppliers && suppliers.length > 0) {
      await localDB.suppliers.bulkPut(suppliers as any[]);
    }

    // 6. Fetch Sales (Recent 100 for offline view to save space)
    const { data: sales, error: salesErr } = await supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100);
    if (salesErr) console.error('Sales Error:', salesErr);
    if (sales && sales.length > 0) {
      await localDB.sales.bulkPut(sales as any[]);

      // Fetch associated sale items
      const saleIds = sales.map(s => s.id);
      const { data: saleItems, error: itemsErr } = await supabase.from('sale_items').select('*').in('sale_id', saleIds);
      if (itemsErr) console.error('Sale Items Error:', itemsErr);
      if (saleItems && saleItems.length > 0) {
        await localDB.saleItems.bulkPut(saleItems as any[]);
      }
    }

    console.log('✅ Initial data sync from Supabase to Dexie complete.');
  } catch (error) {
    console.error('❌ Error syncing data from Supabase:', error);
  }
}
