export type PermissionKey = 
    | 'can_view_dashboard_profit'
    | 'can_add_edit_products'
    | 'can_delete_products'
    | 'can_view_cost_price'
    | 'can_manage_categories'
    | 'can_manage_inventory'
    | 'can_adjust_stock'
    | 'can_view_customers'
    | 'can_add_customers'
    | 'can_receive_due'
    | 'can_manage_suppliers'
    | 'can_view_all_sales' // false for cashier (only sees own)
    | 'can_delete_sale'
    | 'can_return_sale'
    | 'can_manage_purchases'
    | 'can_manage_expenses'
    | 'can_view_reports'
    | 'can_view_profit_loss'
    | 'can_manage_staff'
    | 'can_manage_settings'
    | 'can_manage_qr'
    | 'can_give_discount';

export const DEFAULT_PERMISSIONS: Record<string, Record<PermissionKey, boolean> & { max_discount: number }> = {
    owner: {
        can_view_dashboard_profit: true,
        can_add_edit_products: true,
        can_delete_products: true,
        can_view_cost_price: true,
        can_manage_categories: true,
        can_manage_inventory: true,
        can_adjust_stock: true,
        can_view_customers: true,
        can_add_customers: true,
        can_receive_due: true,
        can_manage_suppliers: true,
        can_view_all_sales: true,
        can_delete_sale: true,
        can_return_sale: true,
        can_manage_purchases: true,
        can_manage_expenses: true,
        can_view_reports: true,
        can_view_profit_loss: true,
        can_manage_staff: true,
        can_manage_settings: true,
        can_manage_qr: true,
        can_give_discount: true,
        max_discount: 100
    },
    admin: {
        can_view_dashboard_profit: true,
        can_add_edit_products: true,
        can_delete_products: true,
        can_view_cost_price: true,
        can_manage_categories: true,
        can_manage_inventory: true,
        can_adjust_stock: true,
        can_view_customers: true,
        can_add_customers: true,
        can_receive_due: true,
        can_manage_suppliers: true,
        can_view_all_sales: true,
        can_delete_sale: false,
        can_return_sale: true,
        can_manage_purchases: true,
        can_manage_expenses: true,
        can_view_reports: true,
        can_view_profit_loss: true,
        can_manage_staff: true,
        can_manage_settings: true,
        can_manage_qr: true,
        can_give_discount: true,
        max_discount: 50
    },
    manager: {
        can_view_dashboard_profit: true,
        can_add_edit_products: true,
        can_delete_products: false,
        can_view_cost_price: true,
        can_manage_categories: true,
        can_manage_inventory: true,
        can_adjust_stock: true,
        can_view_customers: true,
        can_add_customers: true,
        can_receive_due: true,
        can_manage_suppliers: true,
        can_view_all_sales: true,
        can_delete_sale: false,
        can_return_sale: true,
        can_manage_purchases: true,
        can_manage_expenses: true,
        can_view_reports: true,
        can_view_profit_loss: false, // Per plan, configurable but false by default
        can_manage_staff: false,
        can_manage_settings: false,
        can_manage_qr: true,
        can_give_discount: true,
        max_discount: 20
    },
    cashier: {
        can_view_dashboard_profit: false,
        can_add_edit_products: false,
        can_delete_products: false,
        can_view_cost_price: false,
        can_manage_categories: false,
        can_manage_inventory: false,
        can_adjust_stock: false,
        can_view_customers: true,
        can_add_customers: true, // quick add from POS
        can_receive_due: true, // Configurable in plan, default false
        can_manage_suppliers: false,
        can_view_all_sales: false, // sees own sales only
        can_delete_sale: false,
        can_return_sale: false,
        can_manage_purchases: false,
        can_manage_expenses: false,
        can_view_reports: false,
        can_view_profit_loss: false,
        can_manage_staff: false,
        can_manage_settings: false,
        can_manage_qr: false,
        can_give_discount: true, // Configurable
        max_discount: 10
    }
};

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    can_view_dashboard_profit: 'View Dashboard Profit/Loss',
    can_add_edit_products: 'Add/Edit Products',
    can_delete_products: 'Delete Products',
    can_view_cost_price: 'View Cost Price (Purchase Price)',
    can_manage_categories: 'Manage Categories',
    can_manage_inventory: 'Manage Inventory',
    can_adjust_stock: 'Adjust Stock Levels',
    can_view_customers: 'View Customers List',
    can_add_customers: 'Add New Customers',
    can_receive_due: 'Receive Due Payments',
    can_manage_suppliers: 'Manage Suppliers',
    can_view_all_sales: 'View All Sales History (Otherwise only own sales)',
    can_delete_sale: 'Delete Sales',
    can_return_sale: 'Process Sales Returns',
    can_manage_purchases: 'Manage Purchases',
    can_manage_expenses: 'Manage Expenses',
    can_view_reports: 'View Basic Reports',
    can_view_profit_loss: 'View Profit/Loss Reports',
    can_manage_staff: 'Manage Staff Members',
    can_manage_settings: 'Manage Store Settings',
    can_manage_qr: 'Manage QR Menu',
    can_give_discount: 'Give POS Discounts'
};
