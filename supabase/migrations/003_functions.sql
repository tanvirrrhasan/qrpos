-- 003_functions.sql

-- Example Function: Auto-generate SKU if not provided
CREATE OR REPLACE FUNCTION generate_product_sku()
RETURNS TRIGGER AS $$
DECLARE
    store_prefix TEXT;
    next_id INT;
BEGIN
    IF NEW.sku IS NULL OR NEW.sku = '' THEN
        -- Basic example: PRD-YYYYMMDD-UUIDPrefix
        NEW.sku := 'PRD-' || to_char(NOW(), 'YYYYMMDD') || '-' || upper(substring(NEW.id::text from 1 for 4));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_product_sku
    BEFORE INSERT ON products
    FOR EACH ROW
    EXECUTE FUNCTION generate_product_sku();

-- Example Function: Stock Update on Sale
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    -- This would ideally check variants too, simplified for demonstration
    IF NEW.variant_id IS NULL THEN
        UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
    ELSE
        UPDATE product_variants SET stock = stock - NEW.quantity WHERE id = NEW.variant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Uncomment below to enable automatic stock deduction in DB (if not done in app logic)
-- CREATE TRIGGER trigger_update_stock_on_sale
--     AFTER INSERT ON sale_items
--     FOR EACH ROW
--     EXECUTE FUNCTION update_stock_on_sale();

-- Function to automatically link a newly logged-in Auth User to their Staff record
CREATE OR REPLACE FUNCTION public.link_auth_user()
RETURNS void AS $$
BEGIN
  UPDATE public.staff 
  SET auth_user_id = auth.uid() 
  WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid()) 
  AND auth_user_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
