'use client'

import { useState } from 'react'
import { Presentation, GraduationCap, TrendingUp, Plane } from 'lucide-react'
import { MarketingManager } from '@/components/admin/marketing-manager'
import { TrainingsManager } from '@/components/admin/trainings-manager'
import type { MarketingSection } from '@/components/admin/marketing-manager'
import type { TrainingItem } from '@/app/actions/training'
import { cn } from '@/lib/utils'

type Tab = 'marketing' | 'treinamentos' | 'comercial' | 'aereo'

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id: 'marketing',
    label: 'Marketing',
    icon: Presentation,
    desc: 'Gerencie materiais visuais e links para sua equipe.',
  },
  {
    id: 'treinamentos',
    label: 'Treinamentos',
    icon: GraduationCap,
    desc: 'Gerencie os treinamentos disponíveis para os membros no menu da área deles.',
  },
  {
    id: 'comercial',
    label: 'Comercial',
    icon: TrendingUp,
    desc: 'Links e materiais de treinamento comercial.',
  },
  {
    id: 'aereo',
    label: 'Aéreo',
    icon: Plane,
    desc: 'Links e materiais de treinamento aéreo.',
  },
]

const COMERCIAL_SECTIONS: MarketingSection[] = [
  { key: 'comercial', label: 'Links Comercial', type: 'link' },
]

const AEREO_SECTIONS: MarketingSection[] = [
  { key: 'aereo', label: 'Links Aéreo', type: 'link' },
]

export function MarketingTabs({
  marketingItems,
  sections,
  trainingItems,
}: {
  marketingItems: object[]
  sections: MarketingSection[]
  trainingItems: TrainingItem[]
}) {
  const [tab, setTab] = useState<Tab>('marketing')

  const current = TABS.find((t) => t.id === tab)!
  const Icon = current.icon

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{current.label}</h2>
      </div>
      <p className="text-muted-foreground mb-6">{current.desc}</p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-8 flex-wrap">
        {TABS.map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <TabIcon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'marketing' && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MarketingManager items={marketingItems as any} sections={sections} />
      )}
      {tab === 'treinamentos' && (
        <TrainingsManager items={trainingItems} />
      )}
      {tab === 'comercial' && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MarketingManager items={marketingItems as any} sections={COMERCIAL_SECTIONS} />
      )}
      {tab === 'aereo' && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MarketingManager items={marketingItems as any} sections={AEREO_SECTIONS} />
      )}
    </>
  )
}
