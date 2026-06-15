-- ============================================================
-- Certificates table + status workflow + uploads bucket
-- Run this once in Supabase SQL Editor.
-- Safe to run even if certificates table does not exist yet.
-- ============================================================

-- 1. Create certificates table (if not created from migration 004)
CREATE TABLE IF NOT EXISTS certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  authorized_by UUID NOT NULL REFERENCES profiles(id),
  template TEXT NOT NULL DEFAULT 'classic',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

-- 2. Add status column (internal = admin only, approved = member can see)
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';

-- Existing rows keep status = 'approved' so members can still see them

-- 3. Enable RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 4. Drop any old policies and recreate cleanly
DROP POLICY IF EXISTS "Admins can manage certificates" ON certificates;
DROP POLICY IF EXISTS "Members can read own certificates" ON certificates;
DROP POLICY IF EXISTS "Members read own certificates" ON certificates;
DROP POLICY IF EXISTS "Members read own approved certificates" ON certificates;
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;

-- Admins have full access
CREATE POLICY "Admins manage certificates"
  ON certificates FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Members can only read their OWN approved certificates
CREATE POLICY "Members read own approved certificates"
  ON certificates FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND status = 'approved');

-- 5. Storage bucket for certificate template uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Public read uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete uploads" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Public read uploads"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can update uploads"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'uploads');

CREATE POLICY "Authenticated users can delete uploads"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'uploads');
