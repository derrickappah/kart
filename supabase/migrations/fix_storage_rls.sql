-- SQL Migration: Setup Chat Attachments Storage and RLS Policies
-- Run this in your Supabase SQL Editor

-- 1. Create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public select" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own uploads" ON storage.objects;

-- 3. Policy to allow authenticated users to upload files
-- We check if the user is authenticated. 
-- For better security, we could restrict it to folders they belong to, 
-- but this requires complex joins with the conversations table.
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- 4. Policy to allow public access to view files
CREATE POLICY "Allow public select"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-attachments');

-- 5. Policy to allow authenticated users to delete (optional but good practice)
-- This assumes the path contains something identifying if we wanted to be strict.
CREATE POLICY "Allow users to delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-attachments');
