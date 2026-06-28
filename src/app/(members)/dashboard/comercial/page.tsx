import { createAdminClient } from '@/lib/supabase/admin'
import { Briefcase } from 'lucide-react'

export const metadata = { title: 'Condições Comerciais' }

function toEmbedUrl(url: string): string {
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlview?embedded=true`
  }
  return url
}

export default async function ComercialPage() {
  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { data } = await adminClient
    .from('marketing_items')
    .select('url, title')
    .eq('category', 'comercial')
    .neq('status', 'draft')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('order_index')
    .limit(1)

  const item = data?.[0] as { url: string; title: string } | undefined

  if (!item?.url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground p-8">
        <Briefcase className="w-10 h-10 opacity-30" />
        <p className="text-sm">Nenhuma condição comercial disponível no momento.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">
      <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-border shrink-0 bg-card">
        <Briefcase className="w-4 h-4 text-primary" />
        <h1 className="text-sm font-semibold text-foreground">Condições Comerciais</h1>
      </div>
      <iframe
        src={toEmbedUrl(item.url)}
        className="flex-1 w-full border-0"
        title="Condições Comerciais"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
