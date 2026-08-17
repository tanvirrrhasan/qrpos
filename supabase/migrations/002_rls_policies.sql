-- 002_rls_policies.sql

-- Enable Row Level Security
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE due_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE held_carts ENABLE ROW LEVEL SECURITY;

-- Note: We assume the application will pass the `store_id` logic via a custom claim or we'll look it up.
-- For a simplified initial version, we will allow authenticated users full access to their own store.

-- Example function to get the current user's store_id
CREATE OR REPLACE FUNCTION get_auth_store_id() RETURNS UUID AS $$
    SELECT store_id FROM staff WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Simple policies (Can be made more granular based on roles later)

-- Products: Staff can view and edit products in their store
CREATE POLICY "Staff can view their store products" ON products
    FOR SELECT USING (store_id = get_auth_store_id());

CREATE POLICY "Staff can insert their store products" ON products
    FOR INSERT WITH CHECK (store_id = get_auth_store_id());

CREATE POLICY "Staff can update their store products" ON products
    FOR UPDATE USING (store_id = get_auth_store_id());

CREATE POLICY "Staff can delete their store products" ON products
    FOR DELETE USING (store_id = get_auth_store_id());

-- Customers: Staff can view and edit customers in their store
CREATE POLICY "Staff can view their store customers" ON customers
    FOR SELECT USING (store_id = get_auth_store_id());

CREATE POLICY "Staff can insert their store customers" ON customers
    FOR INSERT WITH CHECK (store_id = get_auth_store_id());

CREATE POLICY "Staff can update their store customers" ON customers
    FOR UPDATE USING (store_id = get_auth_store_id());

-- Sales: Staff can view and insert sales
CREATE POLICY "Staff can view their store sales" ON sales
    FOR SELECT USING (store_id = get_auth_store_id());

CREATE POLICY "Staff can insert their store sales" ON sales
    FOR INSERT WITH CHECK (store_id = get_auth_store_id());
    
CREATE POLICY "Staff can update their store sales" ON sales
    FOR UPDATE USING (store_id = get_auth_store_id());

-- To be completed for all other tables as needed. 
-- For development mode or easy onboarding, we might just allow all authenticated users to read/write based on store_id.

-- A generic policy generation approach for development:
DO $$
DECLARE
    t_name text;
BEGIN
    FOR t_name IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name NOT IN ('owners', 'stores')
    LOOP
        -- Check if policies already exist to avoid errors if run multiple times, 
        -- but for a fresh script, we'll just run it.
        BEGIN
            EXECUTE format('
                CREATE POLICY "%I_select" ON %I FOR SELECT USING (store_id = get_auth_store_id());
                CREATE POLICY "%I_insert" ON %I FOR INSERT WITH CHECK (store_id = get_auth_store_id());
                CREATE POLICY "%I_update" ON %I FOR UPDATE USING (store_id = get_auth_store_id());
                CREATE POLICY "%I_delete" ON %I FOR DELETE USING (store_id = get_auth_store_id());
            ', t_name, t_name, t_name, t_name, t_name, t_name, t_name, t_name);
        EXCEPTION WHEN duplicate_object THEN
            -- Ignore if policy already exists
        END;
    END LOOP;
END
$$;

-- Specific policies for stores (since stores uses 'id' instead of 'store_id')
CREATE POLICY "stores_select" ON stores FOR SELECT USING (id = get_auth_store_id());
CREATE POLICY "stores_update" ON stores FOR UPDATE USING (id = get_auth_store_id());
