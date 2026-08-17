export type Role = 'owner' | 'admin' | 'manager' | 'cashier';

export interface Store {
    id: string;
    owner_id: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo_url?: string;
    currency: string;
    currency_code: string;
    timezone: string;
    is_active: boolean;
    settings: any;
    created_at: string;
    updated_at: string;
}

export interface Staff {
    id: string;
    store_id: string;
    auth_user_id?: string;
    name: string;
    phone?: string;
    email?: string;
    role: Role;
    permissions: any;
    pin_code?: string;
    is_active: boolean;
    last_login_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Category {
    id: string;
    store_id: string;
    parent_id?: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    store_id: string;
    category_id?: string;
    name: string;
    description?: string;
    sku: string;
    brand?: string;
    unit: string;
    purchase_price: number;
    selling_price: number;
    stock: number;
    low_stock_alert: number;
    has_variants: boolean;
    image_url?: string;
    thumbnail_url?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by?: string;
}

export interface ProductVariant {
    id: string;
    store_id: string;
    product_id: string;
    variant_type: string;
    variant_value: string;
    sku: string;
    purchase_price: number;
    selling_price: number;
    stock: number;
    low_stock_alert: number;
    image_url?: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Customer {
    id: string;
    store_id: string;
    name: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    total_due: number;
    total_purchases: number;
    purchase_count: number;
    last_purchase_at?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Supplier {
    id: string;
    store_id: string;
    name: string;
    company_name?: string;
    phone?: string;
    email?: string;
    address?: string;
    notes?: string;
    total_due: number;
    total_purchases: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface StoreSetting {
    id: string;
    store_id: string;
    setting_key: string;
    setting_value: any;
    updated_at: string;
}

export interface Sale {
    id: string;
    store_id: string;
    invoice_no: string;
    customer_id?: string;
    staff_id?: string;
    subtotal: number;
    discount_type?: 'percentage' | 'fixed';
    discount_value: number;
    discount_amount: number;
    tax_amount: number;
    total: number;
    paid_amount: number;
    due_amount: number;
    payment_status: 'paid' | 'partial' | 'due';
    change_amount: number;
    notes?: string;
    is_returned: boolean;
    sale_date: string;
    created_at: string;
    updated_at: string;
    is_synced: boolean;
    local_id?: string;
}

export interface SaleItem {
    id: string;
    store_id: string;
    sale_id: string;
    product_id: string;
    variant_id?: string;
    product_name: string;
    variant_info?: string;
    unit_price: number;
    purchase_price: number;
    quantity: number;
    discount_type?: 'percentage' | 'fixed';
    discount_value: number;
    discount_amount: number;
    total: number;
    returned_qty: number;
    created_at: string;
}

export interface SyncQueueItem {
    id?: number; // local auto-increment
    table_name: string;
    operation: 'create' | 'update' | 'delete';
    record_id: string;
    data: any;
    created_at: string;
    retry_count: number;
    last_error?: string;
    status: 'pending' | 'processing' | 'failed' | 'done';
}

export interface StockAdjustment {
    id: string;
    store_id: string;
    product_id: string;
    variant_id?: string;
    staff_id?: string;
    reason: string;
    adjustment_type: '+' | '-' | '=';
    quantity: number;
    notes?: string;
    created_at: string;
}

export interface StockHistory {
    id: string;
    store_id: string;
    product_id: string;
    variant_id?: string;
    action: string;
    quantity_change: number;
    stock_before: number;
    stock_after: number;
    notes?: string;
    ref_id?: string;
    created_at: string;
}

export interface HeldCart {
    id: string;
    store_id: string;
    staff_id?: string;
    label?: string;
    cart_data: any; // Will store the cart items and details
    created_at: string;
    updated_at: string;
}

export interface SalePayment {
    id: string;
    store_id: string;
    sale_id: string;
    payment_method: string;
    amount: number;
    reference_no?: string;
    created_at: string;
}

export interface DuePayment {
    id: string;
    store_id: string;
    customer_id: string;
    amount: number;
    payment_method: string;
    reference_no?: string;
    notes?: string;
    received_by?: string;
    payment_date: string;
    created_at: string;
    is_synced: boolean;
}
export interface ExpenseCategory {
    id: string;
    store_id: string;
    name: string;
    is_active: boolean;
    created_at: string;
}

export interface Expense {
    id: string;
    store_id: string;
    category_id: string;
    staff_id?: string;
    amount: number;
    expense_date: string;
    description?: string;
    payment_method: string;
    reference_no?: string;
    created_at: string;
    updated_at: string;
    is_synced: boolean;
}
