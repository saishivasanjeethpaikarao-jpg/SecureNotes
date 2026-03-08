
-- Add type and media_url columns to messages table
ALTER TABLE public.messages ADD COLUMN type text NOT NULL DEFAULT 'text';
ALTER TABLE public.messages ADD COLUMN media_url text;

-- Create storage bucket for chat media (photos and voice notes)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true);

-- Allow anyone to upload to chat-media bucket
CREATE POLICY "Anyone can upload chat media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media');

-- Allow anyone to read chat media
CREATE POLICY "Anyone can read chat media" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
