-- 010_create_staff_auth.sql

-- Function to create or update staff user in both auth.users and public.staff
CREATE OR REPLACE FUNCTION public.create_staff_auth_user(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_role TEXT,
    p_store_id UUID,
    p_phone TEXT DEFAULT NULL,
    p_pin TEXT DEFAULT NULL,
    p_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
    v_staff_id UUID;
    v_existing_user_id UUID;
BEGIN
    IF p_email IS NULL OR p_email = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email is required');
    END IF;

    -- Check if user already exists in auth.users
    SELECT id INTO v_existing_user_id FROM auth.users WHERE lower(email) = lower(p_email);

    IF v_existing_user_id IS NOT NULL THEN
        v_user_id := v_existing_user_id;

        -- If password provided, update password
        IF p_password IS NOT NULL AND p_password != '' THEN
            v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));
            UPDATE auth.users
            SET encrypted_password = v_encrypted_pw,
                email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
                updated_at = NOW()
            WHERE id = v_user_id;
        END IF;
    ELSE
        IF p_password IS NULL OR length(p_password) < 6 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Password must be at least 6 characters');
        END IF;

        v_user_id := gen_random_uuid();
        v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf'));

        -- Insert into auth.users (auto-confirmed!)
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            lower(p_email),
            v_encrypted_pw,
            NOW(), -- Auto confirm!
            '{"provider": "email", "providers": ["email"]}'::jsonb,
            jsonb_build_object('name', p_name, 'role', p_role, 'store_id', p_store_id),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );

        -- Insert into auth.identities including provider_id
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            provider_id,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', lower(p_email)),
            'email',
            v_user_id::text,
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    -- Upsert into public.staff
    INSERT INTO public.staff (
        store_id,
        auth_user_id,
        name,
        email,
        phone,
        role,
        permissions,
        pin_code,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        p_store_id,
        v_user_id,
        p_name,
        lower(p_email),
        p_phone,
        p_role,
        p_permissions,
        p_pin,
        TRUE,
        NOW(),
        NOW()
    )
    ON CONFLICT (store_id, email) DO UPDATE SET
        auth_user_id = v_user_id,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        pin_code = EXCLUDED.pin_code,
        updated_at = NOW()
    RETURNING id INTO v_staff_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', v_user_id,
        'staff_id', v_staff_id
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;
