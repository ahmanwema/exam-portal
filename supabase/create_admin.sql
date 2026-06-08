-- ============================================================
-- Unda / rekebisha Admin User moja kwa moja kupitia SQL
-- Run hii kwenye Supabase SQL Editor
--
-- Login:
--   Email:    admin@example.com
--   Password: 12345678
-- ============================================================

create extension if not exists pgcrypto;

DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@example.com';
  v_password text := '12345678';
BEGIN
  -- Tumia user aliyepo kama admin email tayari ipo.
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

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
      is_super_admin,
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
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"full_name": "Aman Wema", "role": "admin"}'::jsonb,
      false,
      now(),
      now(),
      '', '', '', ''
    );
  ELSE
    UPDATE auth.users
    SET
      encrypted_password = crypt(v_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = '{"provider": "email", "providers": ["email"]}'::jsonb,
      raw_user_meta_data = '{"full_name": "Aman Wema", "role": "admin"}'::jsonb,
      updated_at = now()
    WHERE id = v_user_id;
  END IF;

  -- Supabase auth.identities schema mpya inahitaji provider_id.
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    v_email,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    now(),
    now(),
    now()
  )
  ON CONFLICT (provider, provider_id) DO UPDATE
    SET
      user_id = excluded.user_id,
      identity_data = excluded.identity_data,
      updated_at = now();

  -- Weka profile ya admin.
  INSERT INTO profiles (id, full_name, email, role, status)
  VALUES (v_user_id, 'Aman Wema', v_email, 'admin', 'approved')
  ON CONFLICT (id) DO UPDATE
    SET
      role = 'admin',
      status = 'approved',
      full_name = 'Aman Wema',
      email = v_email;

  RAISE NOTICE 'Admin yuko tayari. Email: %, Password: %, ID: %', v_email, v_password, v_user_id;
END $$;
