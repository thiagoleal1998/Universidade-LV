-- Famtour/Evento: múltiplos vídeos (era 1 link só) + campo de texto
-- adicional além da descrição curta (rich text, exibido na página de
-- detalhe, abaixo da descrição breve usada nos cards).

ALTER TABLE famtours ADD COLUMN IF NOT EXISTS video_urls TEXT[] NOT NULL DEFAULT '{}';
UPDATE famtours SET video_urls = ARRAY[video_url] WHERE video_url IS NOT NULL AND video_url <> '' AND video_urls = '{}';
ALTER TABLE famtours DROP COLUMN IF EXISTS video_url;
ALTER TABLE famtours ADD COLUMN IF NOT EXISTS extra_content TEXT NOT NULL DEFAULT '';

ALTER TABLE eventos ADD COLUMN IF NOT EXISTS video_urls TEXT[] NOT NULL DEFAULT '{}';
UPDATE eventos SET video_urls = ARRAY[video_url] WHERE video_url IS NOT NULL AND video_url <> '' AND video_urls = '{}';
ALTER TABLE eventos DROP COLUMN IF EXISTS video_url;
ALTER TABLE eventos ADD COLUMN IF NOT EXISTS extra_content TEXT NOT NULL DEFAULT '';
