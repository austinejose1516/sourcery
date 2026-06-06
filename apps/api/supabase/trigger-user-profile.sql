-- ============================================================================
-- Run this once in: Supabase Dashboard → SQL Editor → New query
--
-- What it does: auto-creates a public.users profile row whenever a new
-- auth.users row is inserted — covers email/password AND OAuth (Google, Apple).
--
-- Username is derived from the user's name or email prefix, normalised to
-- lowercase alphanumeric + underscores, then made unique by appending a
-- random 4-digit suffix if the base name is already taken.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_username  text;
  final_username text;
  suffix         int;
  display        text;
BEGIN
  -- Resolve display name: name (email/password) → full_name (OAuth) → email prefix
  display := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- Derive clean base username
  base_username := regexp_replace(lower(display), '[^a-z0-9]', '_', 'g');
  base_username := regexp_replace(base_username, '_+', '_', 'g');
  base_username := trim(both '_' from base_username);
  base_username := left(base_username, 20);
  IF base_username = '' THEN base_username := 'cook'; END IF;

  -- Ensure uniqueness with a random 4-digit suffix if needed
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.users WHERE username = final_username) LOOP
    suffix := floor(random() * 9000 + 1000)::int;
    final_username := left(base_username, 16) || suffix::text;
  END LOOP;

  INSERT INTO public.users (
    id,
    username,
    "displayName",
    languages,
    "updatedAt"
  ) VALUES (
    NEW.id,
    final_username,
    display,
    ARRAY['en'],
    NOW()
  );

  RETURN NEW;
END;
$$;

-- Drop and recreate to make this script idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();
