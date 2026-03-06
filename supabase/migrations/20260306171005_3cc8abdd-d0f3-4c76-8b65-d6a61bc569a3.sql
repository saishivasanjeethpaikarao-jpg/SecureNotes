UPDATE public.app_users 
SET password_hash = crypt('ammu23', gen_salt('bf')) 
WHERE username = 'nani';

UPDATE public.app_users 
SET password_hash = crypt('naniammu', gen_salt('bf')) 
WHERE username = 'ammu';
