'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { type ComponentProps } from 'react'

// next-themes 0.4.x injects a <script> for FOUC prevention; React 19 warns about <script>
// tags inside client components even though the theme still works correctly.
// Suppress this specific advisory until next-themes ships a <template>-based fix.
if (typeof window !== 'undefined') {
  const _orig = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('script tag while rendering React component')) return
    _orig(...args)
  }
}

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
