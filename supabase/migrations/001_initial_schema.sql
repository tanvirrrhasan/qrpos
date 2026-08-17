-- 001_initial_schema.sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Core Tables
CREATE TABLE owners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE,
    phone           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    name            TEXT NOT NULL,
    subscription_plan_id UUID,
    subscription_status  TEXT DEFAULT 'active',
    subscription_start   TIMESTAMPTZ,
    subscription_end     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    address         TEXT,
    phone           TEXT,
    email           TEXT,
    logo_url        TEXT,
    currency        TEXT DEFAULT '৳',
    currency_code   TEXT DEFAULT 'BDT',
    timezone        TEXT DEFAULT 'Asia/Dhaka',
    is_active       BOOLEAN DEFAULT TRUE,
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE staff (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    auth_user_id    UUID UNIQUE, -- Link to auth.users (if using Supabase Auth)
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    role            TEXT NOT NULL DEFAULT 'cashier',
    permissions     JSONB DEFAULT '{}',
    pin_code        TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone),
    UNIQUE(store_id, email)
);

-- 2. Product & Category Tables
CREATE TABLE categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    parent_id       UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    color           TEXT,
    icon            TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name, parent_id)
);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    description     TEXT,
    sku             TEXT,
    brand           TEXT,
    unit            TEXT NOT NULL DEFAULT 'pcs',
    purchase_price  DECIMAL(12,2) DEFAULT 0,
    selling_price   DECIMAL(12,2) DEFAULT 0,
    stock           DECIMAL(12,3) DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 5,
    has_variants    BOOLEAN DEFAULT FALSE,
    image_url       TEXT,
    thumbnail_url   TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES staff(id),
    UNIQUE(store_id, sku)
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(store_id, category_id);
CREATE INDEX idx_products_sku ON products(store_id, sku);
CREATE INDEX idx_products_name ON products(store_id, name);
CREATE INDEX idx_products_active ON products(store_id, is_active);

CREATE TABLE product_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_type    TEXT NOT NULL,
    variant_value   TEXT NOT NULL,
    sku             TEXT,
    purchase_price  DECIMAL(12,2) DEFAULT 0,
    selling_price   DECIMAL(12,2) DEFAULT 0,
    stock           DECIMAL(12,3) DEFAULT 0,
    low_stock_alert INTEGER DEFAULT 5,
    image_url       TEXT,
    sort_order      INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, product_id, variant_type, variant_value),
    UNIQUE(store_id, sku)
);

CREATE INDEX idx_variants_product ON product_variants(product_id);

-- 3. Customer & Supplier Tables
CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    notes           TEXT,
    total_due       DECIMAL(12,2) DEFAULT 0,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    purchase_count  INTEGER DEFAULT 0,
    last_purchase_at TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone)
);

CREATE INDEX idx_customers_store ON customers(store_id);
CREATE INDEX idx_customers_phone ON customers(store_id, phone);
CREATE INDEX idx_customers_due ON customers(store_id, total_due);

CREATE TABLE suppliers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    company_name    TEXT,
    phone           TEXT,
    email           TEXT,
    address         TEXT,
    notes           TEXT,
    total_due       DECIMAL(12,2) DEFAULT 0,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, phone)
);

-- 4. Sales Tables
CREATE TABLE sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    invoice_no      TEXT NOT NULL,
    customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
    staff_id        UUID REFERENCES staff(id) ON DELETE SET NULL,
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_type   TEXT,
    discount_value  DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount      DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    due_amount      DECIMAL(12,2) DEFAULT 0,
    payment_status  TEXT NOT NULL DEFAULT 'paid',
    change_amount   DECIMAL(12,2) DEFAULT 0,
    notes           TEXT,
    is_returned     BOOLEAN DEFAULT FALSE,
    sale_date       TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE,
    local_id        TEXT
);

CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_invoice ON sales(store_id, invoice_no);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(store_id, sale_date);
CREATE INDEX idx_sales_status ON sales(store_id, payment_status);

CREATE TABLE sale_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    product_name    TEXT NOT NULL,
    variant_info    TEXT,
    unit_price      DECIMAL(12,2) NOT NULL,
    purchase_price  DECIMAL(12,2) DEFAULT 0,
    quantity        DECIMAL(12,3) NOT NULL,
    discount_type   TEXT,
    discount_value  DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL,
    returned_qty    DECIMAL(12,3) DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

CREATE TABLE sale_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method  TEXT NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    reference_no    TEXT,
    notes           TEXT,
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Due Payment Table
CREATE TABLE due_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customers(id),
    sale_id         UUID REFERENCES sales(id),
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    reference_no    TEXT,
    notes           TEXT,
    received_by     UUID REFERENCES staff(id),
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_due_payments_customer ON due_payments(customer_id);
CREATE INDEX idx_due_payments_date ON due_payments(store_id, payment_date);

-- 6. Purchase Tables
CREATE TABLE purchases (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    supplier_id     UUID REFERENCES suppliers(id),
    reference_no    TEXT,
    staff_id        UUID REFERENCES staff(id),
    subtotal        DECIMAL(12,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount      DECIMAL(12,2) DEFAULT 0,
    total           DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount     DECIMAL(12,2) DEFAULT 0,
    due_amount      DECIMAL(12,2) DEFAULT 0,
    payment_status  TEXT DEFAULT 'paid',
    notes           TEXT,
    purchase_date   TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_purchases_store ON purchases(store_id);
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(store_id, purchase_date);

CREATE TABLE purchase_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    purchase_id     UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    product_name    TEXT NOT NULL,
    variant_info    TEXT,
    unit_price      DECIMAL(12,2) NOT NULL,
    quantity        DECIMAL(12,3) NOT NULL,
    total           DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supplier_payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    supplier_id     UUID NOT NULL REFERENCES suppliers(id),
    purchase_id     UUID REFERENCES purchases(id),
    amount          DECIMAL(12,2) NOT NULL,
    payment_method  TEXT NOT NULL DEFAULT 'cash',
    reference_no    TEXT,
    notes           TEXT,
    paid_by         UUID REFERENCES staff(id),
    payment_date    TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Inventory / Stock Tables
CREATE TABLE stock_adjustments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    adjustment_type TEXT NOT NULL,
    quantity_change DECIMAL(12,3) NOT NULL,
    stock_before    DECIMAL(12,3) NOT NULL,
    stock_after     DECIMAL(12,3) NOT NULL,
    reason          TEXT NOT NULL,
    adjusted_by     UUID REFERENCES staff(id),
    adjustment_date TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_stock_adj_product ON stock_adjustments(product_id);
CREATE INDEX idx_stock_adj_date ON stock_adjustments(store_id, adjustment_date);

CREATE TABLE stock_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    action          TEXT NOT NULL,
    reference_id    UUID,
    reference_type  TEXT,
    quantity_change DECIMAL(12,3) NOT NULL,
    stock_before    DECIMAL(12,3) NOT NULL,
    stock_after     DECIMAL(12,3) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_history_product ON stock_history(product_id);
CREATE INDEX idx_stock_history_date ON stock_history(store_id, created_at);

-- 8. Expense Tables
CREATE TABLE expense_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    is_default      BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, name)
);

CREATE TABLE expenses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    category_id     UUID REFERENCES expense_categories(id),
    amount          DECIMAL(12,2) NOT NULL,
    description     TEXT,
    reference       TEXT,
    payment_method  TEXT DEFAULT 'cash',
    expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by     UUID REFERENCES staff(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_synced       BOOLEAN DEFAULT TRUE
);

CREATE INDEX idx_expenses_store ON expenses(store_id);
CREATE INDEX idx_expenses_date ON expenses(store_id, expense_date);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- 9. Sale Returns
CREATE TABLE sale_returns (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    sale_id         UUID NOT NULL REFERENCES sales(id),
    customer_id     UUID REFERENCES customers(id),
    staff_id        UUID REFERENCES staff(id),
    total_refund    DECIMAL(12,2) NOT NULL DEFAULT 0,
    refund_method   TEXT NOT NULL,
    reason          TEXT,
    return_date     TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sale_return_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    return_id       UUID NOT NULL REFERENCES sale_returns(id) ON DELETE CASCADE,
    sale_item_id    UUID NOT NULL REFERENCES sale_items(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    variant_id      UUID REFERENCES product_variants(id),
    quantity        DECIMAL(12,3) NOT NULL,
    unit_price      DECIMAL(12,2) NOT NULL,
    refund_amount   DECIMAL(12,2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Settings & Activity Log
CREATE TABLE store_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    setting_key     TEXT NOT NULL,
    setting_value   JSONB NOT NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, setting_key)
);

CREATE TABLE activity_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id),
    action          TEXT NOT NULL,
    entity_type     TEXT,
    entity_id       UUID,
    details         JSONB,
    ip_address      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_store ON activity_log(store_id, created_at);
CREATE INDEX idx_activity_staff ON activity_log(staff_id);

-- 11. Held Carts (POS)
CREATE TABLE held_carts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id),
    customer_id     UUID REFERENCES customers(id),
    cart_name       TEXT,
    items           JSONB NOT NULL,
    notes           TEXT,
    held_at         TIMESTAMPTZ DEFAULT NOW(),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
