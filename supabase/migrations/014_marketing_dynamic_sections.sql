-- Allow any category key (not just the original 4)
ALTER TABLE marketing_items DROP CONSTRAINT IF EXISTS marketing_items_category_check;
