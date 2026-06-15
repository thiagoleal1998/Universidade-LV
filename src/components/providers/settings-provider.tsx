'use client'

import { createContext, useContext } from 'react'
import type { Settings } from '@/lib/settings'

const SettingsContext = createContext<Settings | null>(null)

export function SettingsProvider({ settings, children }: { settings: Settings; children: React.ReactNode }) {
  return <SettingsContext.Provider value={settings}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
