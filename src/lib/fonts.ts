export const HANDWRITING_FONTS = [
  { id: 'Dancing Script', label: 'Dancing Script', weight: '700' },
  { id: 'Great Vibes', label: 'Great Vibes', weight: '400' },
  { id: 'Pacifico', label: 'Pacifico', weight: '400' },
  { id: 'Sacramento', label: 'Sacramento', weight: '400' },
  { id: 'Kaushan Script', label: 'Kaushan Script', weight: '400' },
  { id: 'Satisfy', label: 'Satisfy', weight: '400' },
  { id: 'Pinyon Script', label: 'Pinyon Script', weight: '400' },
  { id: 'Allura', label: 'Allura', weight: '400' },
  { id: 'Alex Brush', label: 'Alex Brush', weight: '400' },
  { id: 'Italianno', label: 'Italianno', weight: '400' },
] as const

export const FONTS_IMPORT_URL =
  'https://fonts.googleapis.com/css2?' +
  HANDWRITING_FONTS.map((f) => `family=${f.id.replace(/ /g, '+')}:wght@${f.weight}`).join('&') +
  '&display=swap'
