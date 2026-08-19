-- 009_public_invoice_schema.sql

CREATE OR REPLACE FUNCTION get_public_invoice_by_id(v_sale_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sale RECORD;
    v_store RECORD;
    v_customer RECORD;
    v_staff RECORD;
    v_receipt_setting JSONB;
    v_items JSONB;
    v_payments JSONB;
    v_result JSONB;
BEGIN
    -- 1. Fetch Sale Record
    SELECT * INTO v_sale FROM sales WHERE id = v_sale_id;

    IF v_sale IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invoice not found');
    END IF;

    -- 2. Fetch Store Info
    SELECT name, address, phone, logo_url INTO v_store FROM stores WHERE id = v_sale.store_id;

    -- 3. Fetch Customer Info
    IF v_sale.customer_id IS NOT NULL THEN
        SELECT name, phone INTO v_customer FROM customers WHERE id = v_sale.customer_id;
    END IF;

    -- 4. Fetch Staff / Cashier Info
    IF v_sale.staff_id IS NOT NULL THEN
        SELECT name INTO v_staff FROM staff WHERE id = v_sale.staff_id;
    END IF;

    -- 5. Fetch Store Receipt Settings
    SELECT setting_value INTO v_receipt_setting
    FROM store_settings
    WHERE store_id = v_sale.store_id AND setting_key = 'receipt';

    -- 6. Fetch Sale Items (Exclude purchase/cost prices)
    SELECT jsonb_agg(
        jsonb_build_object(
            'product_name', product_name,
            'variant_info', variant_info,
            'quantity', quantity,
            'unit_price', unit_price,
            'total', total
        )
    ) INTO v_items
    FROM sale_items
    WHERE sale_id = v_sale.id;

    -- 7. Fetch Payments
    SELECT jsonb_agg(
        jsonb_build_object(
            'payment_method', payment_method,
            'amount', amount,
            'reference_no', reference_no
        )
    ) INTO v_payments
    FROM sale_payments
    WHERE sale_id = v_sale.id;

    -- 8. Build Public Response
    v_result := jsonb_build_object(
        'success', true,
        'id', v_sale.id,
        'invoice_no', v_sale.invoice_no,
        'sale_date', v_sale.sale_date,
        'subtotal', v_sale.subtotal,
        'discount_amount', v_sale.discount_amount,
        'discount_type', v_sale.discount_type,
        'tax_amount', v_sale.tax_amount,
        'total', v_sale.total,
        'paid_amount', v_sale.paid_amount,
        'due_amount', v_sale.due_amount,
        'change_amount', v_sale.change_amount,
        'payment_status', v_sale.payment_status,
        'notes', v_sale.notes,
        'store', jsonb_build_object(
            'name', COALESCE(v_store.name, 'QRPOS Store'),
            'address', COALESCE(v_store.address, ''),
            'phone', COALESCE(v_store.phone, ''),
            'logo_url', v_store.logo_url
        ),
        'customer', CASE WHEN v_customer.name IS NOT NULL THEN jsonb_build_object('name', v_customer.name, 'phone', v_customer.phone) ELSE NULL END,
        'cashier_name', COALESCE(v_staff.name, 'Staff'),
        'receipt_settings', COALESCE(v_receipt_setting, '{}'::jsonb),
        'items', COALESCE(v_items, '[]'::jsonb),
        'payments', COALESCE(v_payments, '[]'::jsonb)
    );

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_invoice_by_id(UUID) TO anon, authenticated;
