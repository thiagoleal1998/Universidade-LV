-- Add instructor fields to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_name TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_role TEXT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_photo_url TEXT;
