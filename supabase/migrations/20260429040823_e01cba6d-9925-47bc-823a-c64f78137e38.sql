-- Add multi-image support to memories
ALTER TABLE public.memories
  ADD COLUMN IF NOT EXISTS image_urls text[] NOT NULL DEFAULT '{}';

-- Backfill image_urls from existing image_url
UPDATE public.memories
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL);

-- Create gallery table
CREATE TABLE IF NOT EXISTS public.gallery (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL,
  title text,
  tag text,
  image_url text NOT NULL
);

ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gallery"
  ON public.gallery FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert gallery"
  ON public.gallery FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update gallery"
  ON public.gallery FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete gallery"
  ON public.gallery FOR DELETE
  USING (true);

CREATE INDEX IF NOT EXISTS gallery_created_at_idx ON public.gallery(created_at DESC);
CREATE INDEX IF NOT EXISTS gallery_tag_idx ON public.gallery(tag);
