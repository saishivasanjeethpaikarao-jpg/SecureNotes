
-- Love Letters Vault
CREATE TABLE public.love_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  receiver TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  unlock_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.love_letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read love_letters" ON public.love_letters FOR SELECT USING (true);
CREATE POLICY "Anyone can insert love_letters" ON public.love_letters FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete love_letters" ON public.love_letters FOR DELETE USING (true);

-- Shared Calendar Events
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'event',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read calendar_events" ON public.calendar_events FOR SELECT USING (true);
CREATE POLICY "Anyone can insert calendar_events" ON public.calendar_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update calendar_events" ON public.calendar_events FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete calendar_events" ON public.calendar_events FOR DELETE USING (true);
