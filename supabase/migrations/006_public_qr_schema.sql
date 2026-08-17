-- 006_public_qr_schema.sql

-- Function to safely fetch public product details without exposing purchase_price or stock
-- Runs as SECURITY DEFINER to bypass RLS, allowing anonymous users to fetch the data.

CREATE OR REPLACE FUNCTION get_public_product_by_sku(p_sku TEXT)
RETURNS jsonb AS $$
DECLARE
    v_product record;
    v_store record;
    v_result jsonb;
BEGIN
    -- Fetch the product
    SELECT id, store_id, name, sku, description, category_id, selling_price, thumbnail_url, has_variants, is_active
    INTO v_product
    FROM products
    WHERE sku = p_sku AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Fetch store details for the public page
    SELECT name, phone, address
    INTO v_store
    FROM stores
    WHERE id = v_product.store_id
    LIMIT 1;

    -- Build the safe JSON object
    v_result := jsonb_build_object(
        'id', v_product.id,
        'name', v_product.name,
        'sku', v_product.sku,
        'description', v_product.description,
        'selling_price', v_product.selling_price,
        'thumbnail_url', v_product.thumbnail_url,
        'has_variants', v_product.has_variants,
        'store_name', v_store.name,
        'store_phone', v_store.phone,
        'store_address', v_store.address
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
