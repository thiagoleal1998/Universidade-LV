-- Add spreadsheet embed URL to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS sheet_url TEXT;
