CREATE TABLE public.call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller text NOT NULL,
  receiver text NOT NULL,
  call_type text NOT NULL DEFAULT 'audio',
  status text NOT NULL DEFAULT 'missed',
  duration_seconds integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);

ALTER TABLE public.call_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read call_history" ON public.call_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert call_history" ON public.call_history FOR INSERT WITH CHECK (true);