import { supabase } from './supabase/client';
import { localDB } from './db/local';
import { SyncQueueItem } from './types';

export type SyncOperation = 'create' | 'update' | 'delete';

export async function processSyncQueue() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return; // Offline, don't try

    const queue = await localDB.syncQueue.where('status').equals('pending').toArray();
    if (queue.length === 0) return;

    for (const item of queue) {
        try {
            if (item.operation === 'create') {
                const { error } = await supabase.from(item.table_name).insert(item.data);
                if (error) throw error;
            } else if (item.operation === 'update') {
                const { error } = await supabase.from(item.table_name).update(item.data).eq('id', item.record_id);
                if (error) throw error;
            } else if (item.operation === 'delete') {
                const { error } = await supabase.from(item.table_name).delete().eq('id', item.record_id);
                if (error) throw error;
            }

            // Mark as done
            await localDB.syncQueue.update(item.id!, { status: 'done' });
        } catch (error: any) {
            console.error('Sync failed for item', item, error);
            await localDB.syncQueue.update(item.id!, { 
                retry_count: (item.retry_count || 0) + 1,
                last_error: error.message
            });
        }
    }
}

/**
 * Unified mutation function for offline-first architecture.
 * It ALWAYS updates the local DB immediately.
 * If online, it tries to update Supabase. If offline or Supabase fails, it queues the request.
 */
export async function mutateData(
    tableName: string, 
    operation: SyncOperation, 
    payload: any,
    localDbTable: any // Reference to localDB.table
) {
    // 1. Update Local DB immediately (Optimistic UI)
    if (operation === 'create' || operation === 'update') {
        await localDbTable.put(payload);
    } else if (operation === 'delete') {
        await localDbTable.delete(payload.id);
    }

    // 2. Try to update Supabase if online
    let isSuccess = false;
    if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
            if (operation === 'create') {
                const { error } = await supabase.from(tableName).insert(payload);
                if (error) throw error;
            } else if (operation === 'update') {
                const { error } = await supabase.from(tableName).update(payload).eq('id', payload.id);
                if (error) throw error;
            } else if (operation === 'delete') {
                const { error } = await supabase.from(tableName).delete().eq('id', payload.id);
                if (error) throw error;
            }
            isSuccess = true;
        } catch (error) {
            console.warn(`Supabase ${operation} failed, falling back to sync queue`, error);
            isSuccess = false;
        }
    }

    // 3. If failed or offline, add to Sync Queue
    if (!isSuccess) {
        await localDB.syncQueue.add({
            table_name: tableName,
            operation: operation,
            record_id: payload.id,
            data: payload,
            status: 'pending',
            retry_count: 0,
            created_at: new Date().toISOString()
        } as SyncQueueItem);
    }
}

/**
 * Pull all data for a specific store from Supabase into the local Dexie DB.
 */
export async function pullDataFromCloud(storeId: string) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error("You are offline. Cannot pull data from cloud.");
    }

    try {
        // Fetch categories
        const { data: cats } = await supabase.from('categories').select('*').eq('store_id', storeId);
        if (cats) await localDB.categories.bulkPut(cats);

        // Fetch products
        const { data: prods } = await supabase.from('products').select('*').eq('store_id', storeId);
        if (prods) await localDB.products.bulkPut(prods);

        // Fetch product variants
        const { data: vars } = await supabase.from('product_variants').select('*').eq('store_id', storeId);
        if (vars) {
            // Need to map product_variants if necessary, but fields match ProductVariant interface
            await localDB.productVariants.bulkPut(vars as any);
        }

        // Fetch customers
        const { data: custs } = await supabase.from('customers').select('*').eq('store_id', storeId);
        if (custs) await localDB.customers.bulkPut(custs);

        // Fetch staff
        const { data: staff } = await supabase.from('staff').select('*').eq('store_id', storeId);
        if (staff) await localDB.table('staff').bulkPut(staff).catch(() => {}); // handle if not in Dexie yet

        // Fetch settings
        const { data: sets } = await supabase.from('store_settings').select('*').eq('store_id', storeId);
        if (sets) await localDB.settings.bulkPut(sets);

        // Fetch user and staff info for role-based sales sync
        const sessionInfo = await supabase.auth.getSession();
        const user = sessionInfo.data.session?.user;
        let currentStaff: any = null;

        if (user) {
            const { data: st } = await supabase.from('staff').select('*').eq('auth_user_id', user.id).single();
            currentStaff = st;
        }

        // Fetch sales according to permission (Owner sees all sales, Cashier sees own sales)
        let salesQuery = supabase.from('sales').select('*').eq('store_id', storeId);

        if (currentStaff && currentStaff.role === 'cashier') {
            salesQuery = salesQuery.eq('staff_id', currentStaff.id);
        }

        const { data: sales } = await salesQuery.order('created_at', { ascending: false }).limit(200);

        if (sales && sales.length > 0) {
            await localDB.sales.bulkPut(sales as any[]);

            const saleIds = sales.map(s => s.id);

            // Fetch associated sale items
            const { data: saleItems } = await supabase.from('sale_items').select('*').in('sale_id', saleIds);
            if (saleItems && saleItems.length > 0) {
                await localDB.saleItems.bulkPut(saleItems as any[]);
            }

            // Fetch associated sale payments
            const { data: salePayments } = await supabase.from('sale_payments').select('*').in('sale_id', saleIds);
            if (salePayments && salePayments.length > 0) {
                await localDB.salePayments.bulkPut(salePayments as any[]);
            }
        }

    } catch (err) {
        console.error("Error pulling data from cloud:", err);
        throw err;
    }
}

/**
 * Full Sync: Push pending changes, then Pull latest cloud data.
 */
export async function fullSync(storeId: string) {
    await processSyncQueue();
    await pullDataFromCloud(storeId);
}
