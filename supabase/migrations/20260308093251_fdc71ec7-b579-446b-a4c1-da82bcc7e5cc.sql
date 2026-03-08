
CREATE TABLE public.memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  memory_date date NOT NULL DEFAULT CURRENT_DATE,
  title text NOT NULL,
  message text,
  photo_url text,
  icon text NOT NULL DEFAULT '📸',
  added_by text NOT NULL,
  CONSTRAINT memories_added_by_check CHECK (added_by IN ('Nani', 'Ammu'))
);

ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read memories" ON public.memories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert memories" ON public.memories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete memories" ON public.memories FOR DELETE USING (true);
