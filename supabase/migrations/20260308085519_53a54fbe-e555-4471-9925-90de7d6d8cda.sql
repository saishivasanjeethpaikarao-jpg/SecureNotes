
-- Reactions table
CREATE TABLE public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_name, emoji)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reactions" ON public.message_reactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reactions" ON public.message_reactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete reactions" ON public.message_reactions FOR DELETE USING (true);

-- Add read tracking to messages
ALTER TABLE public.messages ADD COLUMN read_at timestamptz;

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
