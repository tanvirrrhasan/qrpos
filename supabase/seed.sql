-- Supabase Seed Data for QRPOS

-- 1. Create a demo owner
INSERT INTO owners (id, email, phone, password_hash, name)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin@qrpos.com',
    '01700000000',
    -- In a real app this would be a hashed password. We'll use a dummy hash.
    '$2a$10$xyz123xyz123xyz123xyz123xyz123xyz123xyz123xyz123xyz12',
    'Admin Owner'
) ON CONFLICT (email) DO NOTHING;

-- 2. Create a demo store
INSERT INTO stores (id, owner_id, name, address, phone, email, currency)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'সুপার স্টোর',
    'মিরপুর ১০, ঢাকা',
    '01700000001',
    'store@qrpos.com',
    '৳'
) ON CONFLICT (id) DO NOTHING;

-- 3. Create demo staff (Owner Role)
INSERT INTO staff (id, store_id, name, phone, email, role, pin_code)
VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'Owner Staff',
    '01700000000',
    'admin@qrpos.com',
    'owner',
    '1234'
) ON CONFLICT (store_id, phone) DO NOTHING;

-- 4. Settings
INSERT INTO store_settings (store_id, setting_key, setting_value)
VALUES 
    ('00000000-0000-0000-0000-000000000002', 'business_info', '{"name": "সুপার স্টোর", "address": "মিরপুর ১০, ঢাকা", "phone": "01700000001", "email": "store@qrpos.com"}'),
    ('00000000-0000-0000-0000-000000000002', 'receipt_template', '{"show_logo": true, "header_text": "ধন্যবাদ", "footer_text": "আবার আসবেন!", "show_customer": true, "show_cashier": true}'),
    ('00000000-0000-0000-0000-000000000002', 'invoice_config', '{"prefix": "INV-", "auto_increment": true}'),
    ('00000000-0000-0000-0000-000000000002', 'qr_config', '{"mode": "text", "custom_url_pattern": "", "label_content": {"show_name": true, "show_price": true, "show_sku": true, "show_store": false}}'),
    ('00000000-0000-0000-0000-000000000002', 'payment_methods', '{"cash": true, "bkash": true, "nagad": true, "rocket": false, "bank": false, "card": false}'),
    ('00000000-0000-0000-0000-000000000002', 'feature_toggles', '{"product_variants": true, "sub_categories": true, "expense_tracking": true, "supplier_management": true, "sale_returns": true, "staff_activity_log": true, "hold_cart": true}'),
    ('00000000-0000-0000-0000-000000000002', 'theme', '{"mode": "dark", "primary_color": "#3b82f6"}')
ON CONFLICT (store_id, setting_key) DO NOTHING;

-- 5. Categories
INSERT INTO categories (id, store_id, name, color, icon)
VALUES 
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002', 'খাবার', '#ef4444', '🍔'),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000002', 'পানীয়', '#3b82f6', '🥤'),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000002', 'প্রসাধন', '#8b5cf6', '🧴')
ON CONFLICT (store_id, name, parent_id) DO NOTHING;

-- 6. Products
INSERT INTO products (id, store_id, category_id, name, sku, unit, purchase_price, selling_price, stock, has_variants)
VALUES 
    ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'চিনি ১ কেজি', 'PRD-001', 'kg', 120.00, 140.00, 50, false),
    ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000010', 'ডাল ১ কেজি', 'PRD-002', 'kg', 90.00, 110.00, 30, false),
    ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'কোকাকোলা ১ লিটার', 'PRD-003', 'bottle', 50.00, 60.00, 100, false),
    ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'লাক্স সাবান', 'PRD-004', 'pcs', 40.00, 55.00, 200, false),
    ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000012', 'T-Shirt', 'PRD-005', 'pcs', 0, 0, 0, true)
ON CONFLICT (store_id, sku) DO NOTHING;

-- Product Variants for T-Shirt
INSERT INTO product_variants (id, store_id, product_id, variant_type, variant_value, sku, purchase_price, selling_price, stock)
VALUES 
    ('00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000024', 'Size', 'M', 'PRD-005-M', 250, 350, 15),
    ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000024', 'Size', 'L', 'PRD-005-L', 250, 350, 20),
    ('00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000024', 'Size', 'XL', 'PRD-005-XL', 280, 400, 5)
ON CONFLICT (store_id, sku) DO NOTHING;

-- 7. Customers
INSERT INTO customers (id, store_id, name, phone, total_due)
VALUES 
    ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000002', 'করিম সাহেব', '01711111111', 500.00),
    ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000002', 'রহিম ভাই', '01722222222', 0)
ON CONFLICT (store_id, phone) DO NOTHING;

-- 8. Suppliers
INSERT INTO suppliers (id, store_id, name, company_name, phone, total_due)
VALUES 
    ('00000000-0000-0000-0000-000000000050', '00000000-0000-0000-0000-000000000002', 'আবুল সাপ্লায়ার', 'আবুল এন্টারপ্রাইজ', '01733333333', 1000.00)
ON CONFLICT (store_id, phone) DO NOTHING;
