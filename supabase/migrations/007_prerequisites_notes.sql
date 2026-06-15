-- Module prerequisites: a module can require another to be 100% complete first
ALTER TABLE modules
  ADD COLUMN IF NOT EXISTS prerequisite_module_id UUID REFERENCES modules(id) ON DELETE SET NULL;

-- Admin private notes per member profile
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;
