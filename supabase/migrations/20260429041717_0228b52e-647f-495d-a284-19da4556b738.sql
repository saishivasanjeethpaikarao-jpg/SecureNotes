-- Add frame style support and enable memory editing
ALTER TABLE public.memories ADD COLUMN IF NOT EXISTS frame text;
ALTER TABLE public.gallery ADD COLUMN IF NOT EXISTS frame text;

-- Allow updating memories (for edit feature)
DROP POLICY IF EXISTS "Anyone can update memories" ON public.memories;
CREATE POLICY "Anyone can update memories"
ON public.memories
FOR UPDATE
USING (true)
WITH CHECK (true);