export const COLOR_PRESETS = {
  default: {
    label: 'Padrão',
    hex: '#1a1a1a',
    light: { primary: '0.205 0 0', fg: '0.985 0 0' },
    dark: { primary: '0.922 0 0', fg: '0.205 0 0' },
  },
  blue: {
    label: 'Azul',
    hex: '#2563eb',
    light: { primary: '0.546 0.245 264', fg: '0.985 0 0' },
    dark: { primary: '0.66 0.2 264', fg: '0.985 0 0' },
  },
  purple: {
    label: 'Roxo',
    hex: '#7c3aed',
    light: { primary: '0.558 0.288 302', fg: '0.985 0 0' },
    dark: { primary: '0.67 0.24 302', fg: '0.985 0 0' },
  },
  green: {
    label: 'Verde',
    hex: '#16a34a',
    light: { primary: '0.527 0.154 150', fg: '0.985 0 0' },
    dark: { primary: '0.64 0.14 150', fg: '0.985 0 0' },
  },
  red: {
    label: 'Vermelho',
    hex: '#dc2626',
    light: { primary: '0.577 0.245 27', fg: '0.985 0 0' },
    dark: { primary: '0.67 0.2 27', fg: '0.985 0 0' },
  },
  orange: {
    label: 'Laranja',
    hex: '#ea580c',
    light: { primary: '0.646 0.222 41', fg: '0.985 0 0' },
    dark: { primary: '0.73 0.18 41', fg: '0.985 0 0' },
  },
  pink: {
    label: 'Rosa',
    hex: '#db2777',
    light: { primary: '0.575 0.238 334', fg: '0.985 0 0' },
    dark: { primary: '0.67 0.2 334', fg: '0.985 0 0' },
  },
} as const

export type ColorKey = keyof typeof COLOR_PRESETS
