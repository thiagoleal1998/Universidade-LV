-- Presença ("online agora") e tempo total acumulado na plataforma. Heartbeat
-- client-side (src/components/ui/presence-heartbeat.tsx) grava periodicamente
-- via a function abaixo — sem Supabase Realtime Presence de propósito, o
-- projeto já documentou entrega intermitente de Realtime nesta infra
-- (ver CLAUDE.md, seção Notificações).
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_time_seconds BIGINT NOT NULL DEFAULT 0;

-- Índice parcial: só interessa achar quem esteve ativo recentemente; barato
-- porque poucas linhas qualificam, evita full scan se a base crescer.
CREATE INDEX IF NOT EXISTS profiles_last_seen_at_recent_idx
  ON public.profiles (last_seen_at) WHERE last_seen_at IS NOT NULL;

-- UPDATE atômico: soma ao total só o intervalo desde o heartbeat anterior,
-- e só se esse intervalo for "contínuo" (<=180s — 3x o heartbeat de 60s, ver
-- PRESENCE_ONLINE_WINDOW_MS em src/lib/presence.ts). Isso evita contar como
-- tempo de uso o hiato entre sessões (aba fechada, depois reaberta dias
-- depois) e evita race condition de duas abas do mesmo usuário lendo e
-- escrevendo em dois passos separados — é tudo feito num único statement no
-- servidor Postgres, atomicamente por linha.
CREATE OR REPLACE FUNCTION public.record_presence_heartbeat(p_user_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET
    total_time_seconds = total_time_seconds + CASE
      WHEN last_seen_at IS NOT NULL AND now() - last_seen_at <= INTERVAL '180 seconds'
        THEN GREATEST(EXTRACT(EPOCH FROM (now() - last_seen_at))::BIGINT, 0)
      ELSE 0
    END,
    last_seen_at = now()
  WHERE id = p_user_id;
$$;
