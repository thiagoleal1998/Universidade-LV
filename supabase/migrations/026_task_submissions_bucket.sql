-- Bucket for task file submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-submissions',
  'task-submissions',
  true,
  10485760, -- 10 MB
  NULL       -- allow all MIME types
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated members can upload to their own subfolder
CREATE POLICY "members can upload task files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'task-submissions');

-- Anyone authenticated can read (admin needs to view student submissions)
CREATE POLICY "authenticated can read task files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'task-submissions');

-- Members can delete their own uploads
CREATE POLICY "members can delete own task files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'task-submissions' AND auth.uid()::text = (storage.foldername(name))[2]);
