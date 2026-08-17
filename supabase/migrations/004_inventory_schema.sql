-- 004_inventory_schema.sql
-- New tables for Stock Adjustments and Stock History

CREATE TABLE IF NOT EXISTS stock_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    action          TEXT NOT NULL,
    quantity_change DECIMAL(12,3) NOT NULL,
    stock_before    DECIMAL(12,3) NOT NULL,
    stock_after     DECIMAL(12,3) NOT NULL,
    notes           TEXT,
    ref_id          UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_adjustments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    staff_id        UUID REFERENCES staff(id) ON DELETE SET NULL,
    reason          TEXT NOT NULL,
    adjustment_type TEXT NOT NULL, -- '+', '-', '='
    quantity        DECIMAL(12,3) NOT NULL,
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Setup RLS
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock history for their store" ON stock_history
    FOR SELECT USING (store_id = get_auth_store_id());
CREATE POLICY "Users can insert stock history for their store" ON stock_history
    FOR INSERT WITH CHECK (store_id = get_auth_store_id());

CREATE POLICY "Users can view stock adjustments for their store" ON stock_adjustments
    FOR SELECT USING (store_id = get_auth_store_id());
CREATE POLICY "Users can insert stock adjustments for their store" ON stock_adjustments
    FOR INSERT WITH CHECK (store_id = get_auth_store_id());
