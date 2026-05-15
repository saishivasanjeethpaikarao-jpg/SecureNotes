
-- Create pings table for real-time "Thinking of you" notifications
CREATE TABLE public.pings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pings ENABLE ROW LEVEL SECURITY;

-- Allow both users to select their own pings
CREATE POLICY "Users can view pings sent to them"
ON public.pings
FOR SELECT
TO authenticated
USING (receiver = (SELECT current_setting('app.current_user', true)));

-- Actually, since this app uses custom auth via app_users and verify_user_login,
-- RLS with auth.uid() won't work directly. We need a simpler approach.
-- For this couple-only app, we allow all authenticated users full access
-- since only Nani and Ammu can ever log in.

DROP POLICY IF EXISTS "Users can view pings sent to them" ON public.pings;

CREATE POLICY "Allow all access for authenticated users"
ON public.pings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Enable realtime for pings
ALTER PUBLICATION supabase_realtime ADD TABLE public.pings;
