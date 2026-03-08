
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'memory';
ALTER TABLE public.memories RENAME COLUMN message TO description;
ALTER TABLE public.memories RENAME COLUMN photo_url TO image_url;
ALTER TABLE public.memories RENAME COLUMN added_by TO created_by;
ALTER TABLE public.memories RENAME COLUMN memory_date TO created_at_date;

-- Drop the old constraint if it exists
ALTER TABLE public.memories DROP CONSTRAINT IF EXISTS memories_added_by_check;
ALTER TABLE public.memories ADD CONSTRAINT memories_created_by_check CHECK (created_by IN ('Nani', 'Ammu'));
