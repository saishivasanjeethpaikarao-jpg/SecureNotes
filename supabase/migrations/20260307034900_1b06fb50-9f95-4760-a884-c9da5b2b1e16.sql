
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE public.app_users SET password_hash = crypt('ammu23', gen_salt('bf')) WHERE username = 'Nani';
UPDATE public.app_users SET password_hash = crypt('naniammu', gen_salt('bf')) WHERE username = 'Ammu';
