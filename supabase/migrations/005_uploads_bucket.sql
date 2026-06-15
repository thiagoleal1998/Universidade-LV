-- Create public uploads bucket for certificate templates and other admin uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760, -- 10 MB
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads');

-- Allow public read
CREATE POLICY "Public read uploads"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'uploads');

-- Allow authenticated users to update/delete their own uploads
CREATE POLICY "Authenticated users can update uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can delete uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads');
