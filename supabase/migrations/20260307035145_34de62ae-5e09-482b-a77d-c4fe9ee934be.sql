
CREATE OR REPLACE FUNCTION public.verify_user_login(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.app_users
    WHERE username = p_username
    AND password_hash = extensions.crypt(p_password, password_hash)
  );
END;
$$;

UPDATE public.app_users SET password_hash = extensions.crypt('ammu23', extensions.gen_salt('bf')) WHERE username = 'Nani';
UPDATE public.app_users SET password_hash = extensions.crypt('naniammu', extensions.gen_salt('bf')) WHERE username = 'Ammu';
