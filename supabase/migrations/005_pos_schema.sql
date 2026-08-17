-- 005_pos_schema.sql
-- New table for Held Carts

CREATE TABLE IF NOT EXISTS held_carts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id) ON DELETE SET NULL,
    label           TEXT, -- Optional label like "Table 3" or "Karim Bhai"
    cart_data       JSONB NOT NULL, -- The entire cart JSON including items, customer, discounts
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Setup RLS
ALTER TABLE held_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view held carts for their store" ON held_carts
    FOR SELECT USING (store_id = get_auth_store_id());
CREATE POLICY "Users can insert held carts for their store" ON held_carts
    FOR INSERT WITH CHECK (store_id = get_auth_store_id());
CREATE POLICY "Users can update held carts for their store" ON held_carts
    FOR UPDATE USING (store_id = get_auth_store_id());
CREATE POLICY "Users can delete held carts for their store" ON held_carts
    FOR DELETE USING (store_id = get_auth_store_id());
