
-- Together Room playlist table
CREATE TABLE public.together_playlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_url text NOT NULL,
  title text NOT NULL,
  added_by text NOT NULL,
  media_type text NOT NULL DEFAULT 'music',
  created_at timestamptz NOT NULL DEFAULT now(),
  played boolean NOT NULL DEFAULT false
);

ALTER TABLE public.together_playlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read together_playlist" ON public.together_playlist FOR SELECT USING (true);
CREATE POLICY "Anyone can insert together_playlist" ON public.together_playlist FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update together_playlist" ON public.together_playlist FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete together_playlist" ON public.together_playlist FOR DELETE USING (true);

-- Together Room state table (single row for current state)
CREATE TABLE public.together_room_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_youtube_url text,
  current_title text,
  media_type text DEFAULT 'music',
  is_playing boolean NOT NULL DEFAULT false,
  current_time_seconds numeric NOT NULL DEFAULT 0,
  updated_by text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.together_room_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read room_state" ON public.together_room_state FOR SELECT USING (true);
CREATE POLICY "Anyone can update room_state" ON public.together_room_state FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert room_state" ON public.together_room_state FOR INSERT WITH CHECK (true);

-- Together Room chat messages
CREATE TABLE public.together_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.together_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read together_chat" ON public.together_chat FOR SELECT USING (true);
CREATE POLICY "Anyone can insert together_chat" ON public.together_chat FOR INSERT WITH CHECK (true);

-- Enable realtime for sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.together_room_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.together_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE public.together_playlist;

-- Insert initial room state row
INSERT INTO public.together_room_state (is_playing, current_time_seconds) VALUES (false, 0);
