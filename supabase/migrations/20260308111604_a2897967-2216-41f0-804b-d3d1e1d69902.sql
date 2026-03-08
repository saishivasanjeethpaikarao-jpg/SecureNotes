
-- Listen Together sessions: tracks songs played and each partner's feeling
CREATE TABLE public.listen_together (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url text NOT NULL,
  song_title text NOT NULL,
  started_by text NOT NULL,
  nani_feeling text,
  ammu_feeling text,
  saved_to_memory boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.listen_together ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read listen_together" ON public.listen_together FOR SELECT USING (true);
CREATE POLICY "Anyone can insert listen_together" ON public.listen_together FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update listen_together" ON public.listen_together FOR UPDATE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.listen_together;
