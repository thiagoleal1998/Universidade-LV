'use client'

import { useState } from 'react'
import { Presentation, GraduationCap } from 'lucide-react'
import { MarketingManager } from '@/components/admin/marketing-manager'
import { TrainingsManager } from '@/components/admin/trainings-manager'
import type { MarketingSection } from '@/components/admin/marketing-manager'
import type { TrainingItem } from '@/app/actions/training'
import { cn } from '@/lib/utils'

type Tab = 'marketing' | 'treinamentos'

const TABS = [
  { id: 'marketing' as Tab,     label: 'Marketing',     icon: Presentation  },
  { id: 'treinamentos' as Tab,  label: 'Treinamentos',  icon: GraduationCap },
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

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        {tab === 'marketing'
          ? <Presentation className="w-6 h-6 text-primary" />
          : <GraduationCap className="w-6 h-6 text-primary" />
        }
        <h2 className="text-2xl font-bold text-foreground">
          {tab === 'marketing' ? 'Marketing' : 'Treinamentos'}
        </h2>
      </div>
      <p className="text-muted-foreground mb-6">
        {tab === 'marketing'
          ? 'Gerencie materiais visuais, links, templates de email e scripts para sua equipe.'
          : 'Gerencie os treinamentos disponíveis para os membros no menu da área deles.'
        }
      </p>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
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
            <Icon className="w-4 h-4" />
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
    </>
  )
}
