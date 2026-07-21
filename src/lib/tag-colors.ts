import type { CSSProperties } from 'react'

// Atalhos de paleta na UI de criação/edição de tag — só isso, o valor salvo em
// tags.color agora é sempre um hex (ex: "#3b82f6"), não mais uma dessas chaves.
export const TAG_COLOR_PRESETS = [
  { key: 'blue',    hex: '#3b82f6' },
  { key: 'green',   hex: '#22c55e' },
  { key: 'red',     hex: '#ef4444' },
  { key: 'amber',   hex: '#f59e0b' },
  { key: 'violet',  hex: '#8b5cf6' },
  { key: 'pink',    hex: '#ec4899' },
  { key: 'sky',     hex: '#0ea5e9' },
  { key: 'emerald', hex: '#10b981' },
  { key: 'orange',  hex: '#f97316' },
  { key: 'slate',   hex: '#64748b' },
] as const

// Compat: tags criadas antes da v1.77 salvaram uma dessas chaves em vez de
// hex — resolver pro hex equivalente em vez de rodar uma migração de dados.
const LEGACY_KEY_TO_HEX: Record<string, string> = Object.fromEntries(
  TAG_COLOR_PRESETS.map((c) => [c.key, c.hex])
)

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function isValidHex(value: string): boolean {
  return HEX_RE.test(value)
}

export function resolveTagHex(color: string): string {
  if (HEX_RE.test(color)) return color
  return LEGACY_KEY_TO_HEX[color] ?? TAG_COLOR_PRESETS[0].hex
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type TagColorStyle = {
  hex: string
  chipStyle: CSSProperties
  dotStyle: CSSProperties
  textStyle: CSSProperties
}

export function getTagColor(color: string): TagColorStyle {
  const hex = resolveTagHex(color)
  return {
    hex,
    chipStyle: { backgroundColor: hexToRgba(hex, 0.15), color: hex },
    dotStyle: { backgroundColor: hex },
    textStyle: { color: hex },
  }
}

export function formatMemberCode(num: number | null | undefined): string {
  if (!num) return '—'
  return `LV-${String(num).padStart(4, '0')}`
}
