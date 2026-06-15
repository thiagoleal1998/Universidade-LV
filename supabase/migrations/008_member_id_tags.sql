-- ============================================================
-- Member sequential ID + Tags system
-- ============================================================

-- 1. Sequential member number (auto-assigned on insert)
CREATE SEQUENCE IF NOT EXISTS member_number_seq START 1;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_number INTEGER;

CREATE OR REPLACE FUNCTION assign_member_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.member_number IS NULL THEN
    NEW.member_number := nextval('member_number_seq');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_assign_member_number ON profiles;
CREATE TRIGGER trigger_assign_member_number
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_member_number();

-- Assign IDs to all existing members
UPDATE profiles
SET member_number = nextval('member_number_seq')
WHERE member_number IS NULL;

-- 2. Tags table
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT 'blue',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage tags" ON tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Authenticated users read tags" ON tags FOR SELECT TO authenticated
  USING (true);

-- 3. Profile → Tags join table
CREATE TABLE IF NOT EXISTS profile_tags (
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (profile_id, tag_id)
);

ALTER TABLE profile_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage profile_tags" ON profile_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Members read own profile_tags" ON profile_tags FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
