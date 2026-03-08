
CREATE TABLE public.game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type TEXT NOT NULL,
  played_by TEXT NOT NULL,
  partner TEXT NOT NULL,
  question_text TEXT,
  result TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game_results" ON public.game_results FOR SELECT USING (true);
CREATE POLICY "Anyone can insert game_results" ON public.game_results FOR INSERT WITH CHECK (true);
