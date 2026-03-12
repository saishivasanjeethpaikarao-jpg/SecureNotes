
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function to call the push notification edge function
CREATE OR REPLACE FUNCTION public.notify_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
DECLARE
  payload jsonb;
  notification_type text;
  edge_function_url text;
  service_role_key text;
BEGIN
  -- Determine notification type based on table
  IF TG_TABLE_NAME = 'messages' THEN
    notification_type := 'message';
  ELSIF TG_TABLE_NAME = 'stars' THEN
    notification_type := 'star';
  ELSIF TG_TABLE_NAME = 'milestones' THEN
    notification_type := 'milestone';
  ELSE
    RETURN NEW;
  END IF;

  payload := jsonb_build_object(
    'type', notification_type,
    'record', to_jsonb(NEW)
  );

  -- Get secrets for the edge function call
  edge_function_url := 'https://gewxvkxkrszvtcabxkdd.supabase.co/functions/v1/send-push-notification';
  
  SELECT decrypted_secret INTO service_role_key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  -- Make HTTP request to edge function using pg_net
  PERFORM net.http_post(
    url := edge_function_url,
    body := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    )
  );

  RETURN NEW;
END;
$$;

-- Create triggers on messages, stars, and milestones tables
CREATE TRIGGER on_message_insert_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push();

CREATE TRIGGER on_star_insert_push
  AFTER INSERT ON public.stars
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push();

CREATE TRIGGER on_milestone_insert_push
  AFTER INSERT ON public.milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_push();
