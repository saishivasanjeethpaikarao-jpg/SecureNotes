-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===============================
-- USERS TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS public.app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert fixed users
INSERT INTO public.app_users (username, password_hash)
VALUES
('Nani', crypt('ammu23', gen_salt('bf'))),
('Ammu', crypt('naniammu', gen_salt('bf')))
ON CONFLICT (username) DO NOTHING;

-- ===============================
-- STARS HISTORY TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS public.stars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giver TEXT NOT NULL CHECK (giver IN ('Nani','Ammu')),
  receiver TEXT NOT NULL CHECK (receiver IN ('Nani','Ammu')),
  value INTEGER NOT NULL CHECK (value IN (1,-1)),
  reason TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Prevent giving stars to yourself
ALTER TABLE public.stars
ADD CONSTRAINT giver_receiver_check
CHECK (giver <> receiver);

-- ===============================
-- TOTAL STARS TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS public.totals (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nani_total INTEGER NOT NULL DEFAULT 0,
  ammu_total INTEGER NOT NULL DEFAULT 0
);

-- ensure only one row exists
INSERT INTO public.totals (id, nani_total, ammu_total)
VALUES (1,0,0)
ON CONFLICT (id) DO NOTHING;

-- ===============================
-- MILESTONES TABLE
-- ===============================

CREATE TABLE IF NOT EXISTS public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL CHECK (username IN ('Nani','Ammu')),
  milestone_value INTEGER NOT NULL,
  reached_at TIMESTAMPTZ DEFAULT now(),
  gift_given BOOLEAN DEFAULT false,
  UNIQUE(username, milestone_value)
);

-- ===============================
-- FUNCTION: UPDATE TOTALS
-- ===============================

CREATE OR REPLACE FUNCTION update_star_totals()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.receiver = 'Nani' THEN
    UPDATE public.totals
    SET nani_total = nani_total + NEW.value
    WHERE id = 1;
  END IF;

  IF NEW.receiver = 'Ammu' THEN
    UPDATE public.totals
    SET ammu_total = ammu_total + NEW.value
    WHERE id = 1;
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

-- ===============================
-- TRIGGER: RUN AFTER STAR INSERT
-- ===============================

DROP TRIGGER IF EXISTS star_total_trigger ON public.stars;

CREATE TRIGGER star_total_trigger
AFTER INSERT ON public.stars
FOR EACH ROW
EXECUTE FUNCTION update_star_totals();

-- ===============================
-- FUNCTION: CHECK MILESTONES
-- ===============================

CREATE OR REPLACE FUNCTION check_milestone()
RETURNS TRIGGER AS $$
DECLARE
  current_total INTEGER;
BEGIN

  IF NEW.receiver = 'Nani' THEN
    SELECT nani_total INTO current_total FROM totals WHERE id=1;
  ELSE
    SELECT ammu_total INTO current_total FROM totals WHERE id=1;
  END IF;

  IF current_total % 50 = 0 AND current_total > 0 THEN
    INSERT INTO public.milestones(username, milestone_value)
    VALUES (NEW.receiver, current_total)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS milestone_trigger ON public.stars;

CREATE TRIGGER milestone_trigger
AFTER INSERT ON public.stars
FOR EACH ROW
EXECUTE FUNCTION check_milestone();

-- ===============================
-- ENABLE REALTIME (Supabase)
-- ===============================

ALTER PUBLICATION supabase_realtime ADD TABLE public.stars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.totals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
