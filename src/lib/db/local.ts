import Dexie, { type Table } from 'dexie';
import type {
    Product, ProductVariant, Category, Customer, Supplier, Sale, SaleItem, SalePayment,
    DuePayment, SyncQueueItem, StoreSetting, StockAdjustment, StockHistory, HeldCart
} from '../types';

// ─── Extended types for new tables ──────────────────────

export interface Expense {
    id: string;
    store_id: string;
    category_id?: string;
    staff_id?: string;
    amount: number;
    description?: string;
    reference?: string;
    payment_method: string;
    expense_date: string;
    recorded_by?: string;
    created_at: string;
    updated_at: string;
    is_synced: boolean;
}

export interface ExpenseCategory {
    id: string;
    store_id: string;
    name: string;
    is_default: boolean;
    is_active: boolean;
    created_at: string;
}

export interface Purchase {
    id: string;
    store_id: string;
    supplier_id?: string;
    reference_no?: string;
    staff_id?: string;
    subtotal: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    paid_amount: number;
    due_amount: number;
    payment_status: 'paid' | 'partial' | 'due';
    notes?: string;
    purchase_date: string;
    created_at: string;
    updated_at: string;
    is_synced: boolean;
}

export interface PurchaseItem {
    id: string;
    store_id: string;
    purchase_id: string;
    product_id: string;
    variant_id?: string;
    product_name: string;
    variant_info?: string;
    unit_price: number;
    quantity: number;
    total: number;
    created_at: string;
}

export interface SupplierPayment {
    id: string;
    store_id: string;
    supplier_id: string;
    purchase_id?: string;
    amount: number;
    payment_method: string;
    reference_no?: string;
    notes?: string;
    paid_by?: string;
    payment_date: string;
    created_at: string;
}

export interface SaleReturn {
    id: string;
    store_id: string;
    sale_id: string;
    customer_id?: string;
    staff_id?: string;
    total_refund: number;
    refund_method: string;
    reason?: string;
    return_date: string;
    created_at: string;
}

export interface SaleReturnItem {
    id: string;
    store_id: string;
    return_id: string;
    sale_item_id: string;
    product_id: string;
    variant_id?: string;
    quantity: number;
    unit_price: number;
    refund_amount: number;
    created_at: string;
}

export interface StaffRecord {
    id: string;
    store_id: string;
    auth_user_id?: string;
    name: string;
    phone?: string;
    email?: string;
    role: 'owner' | 'admin' | 'manager' | 'cashier';
    permissions: Record<string, unknown>;
    pin_code?: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
}

export interface ActivityLog {
    id: string;
    store_id: string;
    staff_id?: string;
    action: string;
    entity_type?: string;
    entity_id?: string;
    details?: Record<string, unknown>;
    created_at: string;
}

// ─── Dexie Database ─────────────────────────────────────

export class QRPOSLocalDB extends Dexie {
    products!: Table<Product, string>;
    productVariants!: Table<ProductVariant, string>;
    categories!: Table<Category, string>;
    customers!: Table<Customer, string>;
    suppliers!: Table<Supplier, string>;
    sales!: Table<Sale, string>;
    saleItems!: Table<SaleItem, string>;
    salePayments!: Table<SalePayment, string>;
    duePayments!: Table<DuePayment, string>;
    settings!: Table<StoreSetting, string>;
    syncQueue!: Table<SyncQueueItem, number>;
    stock_history!: Table<StockHistory, string>;
    stock_adjustments!: Table<StockAdjustment, string>;
    heldCarts!: Table<HeldCart, string>;
    // New tables
    expenses!: Table<Expense, string>;
    expenseCategories!: Table<ExpenseCategory, string>;
    purchases!: Table<Purchase, string>;
    purchaseItems!: Table<PurchaseItem, string>;
    supplierPayments!: Table<SupplierPayment, string>;
    saleReturns!: Table<SaleReturn, string>;
    saleReturnItems!: Table<SaleReturnItem, string>;
    staff!: Table<StaffRecord, string>;
    activityLog!: Table<ActivityLog, string>;

    constructor() {
        super('qrpos');
        
        this.version(4).stores({
            products: 'id, store_id, sku, category_id, name, is_active, created_at, has_variants',
            productVariants: 'id, product_id, sku, store_id, is_active, created_at',
            categories: 'id, store_id, parent_id, is_active, created_at',
            customers: 'id, store_id, phone, name, is_active',
            suppliers: 'id, store_id, phone, name, is_active',
            sales: 'id, store_id, invoice_no, customer_id, sale_date, created_at, staff_id, total, due_amount',
            saleItems: 'id, sale_id, product_id, store_id, created_at',
            salePayments: 'id, sale_id, store_id, created_at',
            duePayments: 'id, customer_id, payment_date, store_id, sale_id, created_at',
            settings: 'id, store_id, setting_key',
            syncQueue: '++id, table_name, status, created_at',
            stock_history: 'id, store_id, product_id, created_at',
            stock_adjustments: 'id, store_id, product_id, created_at',
            heldCarts: 'id, store_id, created_at, staff_id',
            // New tables
            expenses: 'id, store_id, category_id, expense_date',
            expenseCategories: 'id, store_id, name',
            purchases: 'id, store_id, supplier_id, purchase_date',
            purchaseItems: 'id, purchase_id, product_id',
            supplierPayments: 'id, supplier_id, payment_date',
            saleReturns: 'id, store_id, sale_id, return_date, created_at',
            saleReturnItems: 'id, return_id, product_id, sale_item_id, store_id, created_at',
            staff: 'id, store_id, auth_user_id, role',
            activityLog: 'id, store_id, staff_id, created_at'
        });
    }
}

export const localDB = new QRPOSLocalDB();
