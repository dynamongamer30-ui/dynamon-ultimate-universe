-- Restrict avatar uploads to common raster image formats and a 10 MiB limit.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp']::text[]
WHERE id = 'avatars';
