-- 007_storage_bucket.sql
-- Create product-images public storage bucket and set RLS policies

-- 1. Create the bucket (Public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow public to read images (For landing page)
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- 3. Allow authenticated users to upload images (For POS admins)
CREATE POLICY "Auth Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( auth.role() = 'authenticated' AND bucket_id = 'product-images' );

-- 4. Allow authenticated users to update/overwrite images
CREATE POLICY "Auth Update Access"
ON storage.objects FOR UPDATE
USING ( auth.role() = 'authenticated' AND bucket_id = 'product-images' );
