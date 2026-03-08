
-- Couple shared playlist
CREATE TABLE public.couple_playlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url text NOT NULL,
  song_title text NOT NULL,
  added_by text NOT NULL,
  is_favorite boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.couple_playlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read couple_playlist" ON public.couple_playlist FOR SELECT USING (true);
CREATE POLICY "Anyone can insert couple_playlist" ON public.couple_playlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update couple_playlist" ON public.couple_playlist FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete couple_playlist" ON public.couple_playlist FOR DELETE USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.couple_playlist;
