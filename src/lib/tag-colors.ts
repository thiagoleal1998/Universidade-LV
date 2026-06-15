export const TAG_COLORS = [
  { key: 'blue',    bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-500' },
  { key: 'green',   bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-500' },
  { key: 'red',     bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-500' },
  { key: 'amber',   bg: 'bg-amber-100',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  { key: 'violet',  bg: 'bg-violet-100',  text: 'text-violet-800',  dot: 'bg-violet-500' },
  { key: 'pink',    bg: 'bg-pink-100',    text: 'text-pink-800',    dot: 'bg-pink-500' },
  { key: 'sky',     bg: 'bg-sky-100',     text: 'text-sky-800',     dot: 'bg-sky-500' },
  { key: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  { key: 'orange',  bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-500' },
  { key: 'slate',   bg: 'bg-slate-100',   text: 'text-slate-700',   dot: 'bg-slate-500' },
] as const

export type TagColorKey = typeof TAG_COLORS[number]['key']

export function getTagColor(key: string) {
  return TAG_COLORS.find((c) => c.key === key) ?? TAG_COLORS[0]
}

export function formatMemberCode(num: number | null | undefined): string {
  if (!num) return '—'
  return `LV-${String(num).padStart(4, '0')}`
}
