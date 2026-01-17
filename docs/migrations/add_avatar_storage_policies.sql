-- Avatar Storage Bucket Policies
-- Run this in Supabase SQL Editor to enable avatar uploads
--
-- Prerequisites:
-- 1. The 'avatars' bucket must exist in Storage
-- 2. If it doesn't exist, create it first:
--    INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Allow authenticated users to upload their own avatar
CREATE POLICY "Users can upload avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid() IS NOT NULL
);

-- Allow users to update/replace their avatar
CREATE POLICY "Users can update avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);

-- Allow anyone to view avatars (public)
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow users to delete their avatar
CREATE POLICY "Users can delete avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid() IS NOT NULL);
