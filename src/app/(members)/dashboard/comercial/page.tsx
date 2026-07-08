import { createAdminClient } from '@/lib/supabase/admin'
import { Briefcase, Trophy } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Condições Comerciais' }

function toEmbedUrl(url: string): string {
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlview?embedded=true`
  }
  return url
}

const TABS = [
  { key: 'comercial',      label: 'Condições Comerciais', icon: Briefcase },
  { key: 'corrida_vendas', label: 'Corrida de vendas',    icon: Trophy    },
] as const

export default async function ComercialPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const activeKey = TABS.find((t) => t.key === tab)?.key ?? 'comercial'

  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { data } = await adminClient
    .from('marketing_items')
    .select('url, title')
    .eq('category', activeKey)
    .neq('status', 'draft')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('order_index')
    .limit(1)

  const item = data?.[0] as { url: string; title: string } | undefined
  const currentTab = TABS.find((t) => t.key === activeKey)!

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">
      {/* Abas */}
      <div className="flex items-center gap-0 border-b border-border shrink-0 bg-card px-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`?tab=${key}`}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeKey === key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </div>

      {!item?.url ? (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground p-8">
          <currentTab.icon className="w-10 h-10 opacity-30" />
          <p className="text-sm">Nenhum conteúdo disponível no momento.</p>
        </div>
      ) : (
        <iframe
          src={toEmbedUrl(item.url)}
          className="flex-1 w-full border-0"
          title={currentTab.label}
          allow="clipboard-read; clipboard-write"
        />
      )}
    </div>
  )
}
