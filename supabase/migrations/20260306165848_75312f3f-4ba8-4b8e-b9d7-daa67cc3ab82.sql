
-- Create users table for Nani and Ammu
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stars history table
CREATE TABLE public.stars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  giver TEXT NOT NULL,
  receiver TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value IN (1, -1)),
  reason TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create totals table
CREATE TABLE public.totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nani_total INTEGER NOT NULL DEFAULT 0,
  ammu_total INTEGER NOT NULL DEFAULT 0
);

-- Create milestones table
CREATE TABLE public.milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL,
  milestone_value INTEGER NOT NULL,
  reached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  gift_given BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(username, milestone_value)
);

-- Enable RLS on all tables
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all data
CREATE POLICY "Anyone can read app_users" ON public.app_users FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read stars" ON public.stars FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert stars" ON public.stars FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can read totals" ON public.totals FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can update totals" ON public.totals FOR UPDATE TO anon, authenticated USING (true);
CREATE POLICY "Anyone can read milestones" ON public.milestones FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Anyone can insert milestones" ON public.milestones FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update milestones" ON public.milestones FOR UPDATE TO anon, authenticated USING (true);

-- Insert initial totals row
INSERT INTO public.totals (nani_total, ammu_total) VALUES (0, 0);

-- Insert the two users with simple passwords (hashed with pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
INSERT INTO public.app_users (username, password_hash) VALUES 
  ('Nani', crypt('nani123', gen_salt('bf'))),
  ('Ammu', crypt('ammu123', gen_salt('bf')));

-- Enable realtime on stars and totals
ALTER PUBLICATION supabase_realtime ADD TABLE public.stars;
ALTER PUBLICATION supabase_realtime ADD TABLE public.totals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestones;
