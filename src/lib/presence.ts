// "Online agora" + tempo total na plataforma. Heartbeat client-side (não
// Supabase Realtime Presence — CLAUDE.md já documenta entrega intermitente
// de Realtime nesta infra) grava presença a cada PRESENCE_HEARTBEAT_MS via
// src/app/actions/presence.ts. Janela de "online" tolera heartbeats perdidos.
export const PRESENCE_HEARTBEAT_MS = 60_000
export const PRESENCE_ONLINE_WINDOW_MS = 3 * PRESENCE_HEARTBEAT_MS

export function presenceSinceIso(): string {
  return new Date(Date.now() - PRESENCE_ONLINE_WINDOW_MS).toISOString()
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours === 0 && minutes === 0) return '< 1min'
  if (hours === 0) return `${minutes}min`
  return `${hours}h ${minutes}min`
}
