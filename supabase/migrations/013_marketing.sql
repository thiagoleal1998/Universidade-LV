CREATE TABLE IF NOT EXISTS marketing_items (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category    TEXT        NOT NULL CHECK (category IN ('visual', 'link', 'email', 'script')),
  title       TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  content     TEXT        NOT NULL DEFAULT '',
  url         TEXT        NOT NULL DEFAULT '',
  order_index INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage marketing" ON marketing_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-files', 'marketing-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read marketing files" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'marketing-files');

CREATE POLICY "Admins upload marketing files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketing-files' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins delete marketing files" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'marketing-files' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
