
CREATE OR REPLACE FUNCTION public.verify_user_login(p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_users
    WHERE username = p_username
    AND password_hash = crypt(p_password, password_hash)
  );
END;
$$;
