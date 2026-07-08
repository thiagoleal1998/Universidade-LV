'use client'

import { useState } from 'react'
import { Presentation, GraduationCap, TrendingUp, Plane, Trophy, Headphones, Link2, Zap } from 'lucide-react'
import { MarketingManager } from '@/components/admin/marketing-manager'
import { TrainingsManager } from '@/components/admin/trainings-manager'
import { TamoJuntoWinnersManager } from '@/components/admin/tamojunto-winners-manager'
import { PodviajarManager } from '@/components/admin/podviajar-manager'
import { CorridaVendasManager } from '@/components/admin/corrida-vendas-manager'
import type { MarketingSection } from '@/components/admin/marketing-manager'
import type { TrainingItem } from '@/app/actions/training'
import type { MarketingProduct, MarketingPeriod } from '@/app/actions/marketing'
import type { Tag } from '@/components/admin/marketing-manager'
import { cn } from '@/lib/utils'

type Tab = 'marketing' | 'treinamentos' | 'comercial' | 'aereo' | 'premiacao' | 'podviajar'
type ComercialSubTab = 'links' | 'corrida'

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
  {
    id: 'premiacao',
    label: 'Premiação',
    icon: Trophy,
    desc: 'Defina os vencedores do mês do TamoJunto LV por região do Brasil.',
  },
  {
    id: 'podviajar',
    label: 'PodViajar',
    icon: Headphones,
    desc: 'Gerencie as informações e episódios do podcast PodViajar.',
  },
]

const COMERCIAL_LINKS_SECTIONS: MarketingSection[] = [
  { key: 'comercial', label: 'Links Comercial', type: 'link' },
]

const AEREO_SECTIONS: MarketingSection[] = [
  { key: 'aereo', label: 'Links Aéreo', type: 'link' },
]

const COMERCIAL_SUBTABS: { id: ComercialSubTab; label: string; icon: React.ElementType }[] = [
  { id: 'links',   label: 'Links Comercial',   icon: Link2 },
  { id: 'corrida', label: 'Corrida de vendas', icon: Zap   },
]

export function MarketingTabs({
  marketingItems,
  sections,
  trainingItems,
  products = [],
  periods = [],
  tags = [],
  tamojuntoWinnersRaw = '{}',
  podviajarRaw = '{}',
  corridaVendasRaw = '{}',
}: {
  marketingItems: object[]
  sections: MarketingSection[]
  trainingItems: TrainingItem[]
  products?: MarketingProduct[]
  periods?: MarketingPeriod[]
  tags?: Tag[]
  tamojuntoWinnersRaw?: string
  podviajarRaw?: string
  corridaVendasRaw?: string
}) {
  const [tab, setTab] = useState<Tab>('marketing')
  const [comercialSubTab, setComercialSubTab] = useState<ComercialSubTab>('links')

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

      {/* Tabs principais */}
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
        <MarketingManager items={marketingItems as any} sections={sections} products={products} periods={periods} tags={tags} />
      )}
      {tab === 'treinamentos' && (
        <TrainingsManager items={trainingItems} />
      )}
      {tab === 'comercial' && (
        <>
          {/* Sub-abas do Comercial */}
          <div className="flex gap-0 border-b border-border mb-6">
            {COMERCIAL_SUBTABS.map(({ id, label, icon: SubIcon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setComercialSubTab(id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                  comercialSubTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <SubIcon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {comercialSubTab === 'links' && (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <MarketingManager items={marketingItems as any} sections={COMERCIAL_LINKS_SECTIONS} />
          )}
          {comercialSubTab === 'corrida' && (
            <CorridaVendasManager raw={corridaVendasRaw} />
          )}
        </>
      )}
      {tab === 'aereo' && (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MarketingManager items={marketingItems as any} sections={AEREO_SECTIONS} />
      )}
      {tab === 'premiacao' && (
        <TamoJuntoWinnersManager raw={tamojuntoWinnersRaw} />
      )}
      {tab === 'podviajar' && (
        <PodviajarManager raw={podviajarRaw} />
      )}
    </>
  )
}
