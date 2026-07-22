-- Drop the default 'Pending' value from verification_status so new users do not start as Pending
ALTER TABLE public.profiles ALTER COLUMN verification_status DROP DEFAULT;

-- Add attempts column to public.email_verifications table for brute-force protection
ALTER TABLE public.email_verifications ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- Drop and recreate the update policy for users on their own profiles
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ( auth.uid() = id )
  WITH CHECK ( auth.uid() = id );

-- Create the trigger function to restrict non-admin profile modifications
CREATE OR REPLACE FUNCTION public.check_profile_update_restrictions()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is admin or the request is service_role, allow everything
  IF auth.role() = 'service_role' OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RETURN NEW;
  END IF;

  -- Prevent non-admins from modifying is_admin
  IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    RAISE EXCEPTION 'Cannot modify is_admin field';
  END IF;

  -- Prevent non-admins from modifying banned
  IF NEW.banned IS DISTINCT FROM OLD.banned THEN
    RAISE EXCEPTION 'Cannot modify banned field';
  END IF;

  -- Prevent non-admins from modifying is_verified
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified THEN
    RAISE EXCEPTION 'Cannot modify is_verified field';
  END IF;

  -- Prevent non-admins from modifying verification_status to anything other than 'Pending'
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF NEW.verification_status IS DISTINCT FROM 'Pending' THEN
      RAISE EXCEPTION 'Cannot modify verification_status to %', NEW.verification_status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to profiles
DROP TRIGGER IF EXISTS tr_check_profile_update_restrictions ON public.profiles;
CREATE TRIGGER tr_check_profile_update_restrictions
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_profile_update_restrictions();
