-- Ensure the lesson-photos bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-photos', 'lesson-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read (members and guests can load images in lessons)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read lesson photos'
  ) THEN
    CREATE POLICY "Public read lesson photos" ON storage.objects
      FOR SELECT TO public
      USING (bucket_id = 'lesson-photos');
  END IF;
END $$;

-- Admins can upload lesson photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins upload lesson photos'
  ) THEN
    CREATE POLICY "Admins upload lesson photos" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'lesson-photos' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- Admins can delete lesson photos
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Admins delete lesson photos'
  ) THEN
    CREATE POLICY "Admins delete lesson photos" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'lesson-photos' AND
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;
