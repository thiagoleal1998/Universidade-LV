import { createAdminClient } from '@/lib/supabase/admin'
import { Plane } from 'lucide-react'

export const metadata = { title: 'Bloqueios Aéreos' }

function toEmbedUrl(url: string): string {
  // Google Sheets: converte para URL embeddable
  const sheetsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([^/]+)/)
  if (sheetsMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetsMatch[1]}/htmlview?embedded=true`
  }
  return url
}

export default async function AereoPage() {
  const adminClient = createAdminClient()
  const now = new Date().toISOString()

  const { data } = await adminClient
    .from('marketing_items')
    .select('url, title')
    .eq('category', 'aereo')
    .neq('status', 'draft')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('order_index')
    .limit(1)

  const item = data?.[0] as { url: string; title: string } | undefined

  if (!item?.url) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3 text-muted-foreground p-8">
        <Plane className="w-10 h-10 opacity-30" />
        <p className="text-sm">Nenhum bloqueio aéreo disponível no momento.</p>
      </div>
    )
  }

  const embedUrl = toEmbedUrl(item.url)

  return (
    // h-screen igual ao StudyInterface, compensando a barra mobile (h-14 = 3.5rem)
    <div className="flex flex-col h-[calc(100dvh-3.5rem)] md:h-screen">
      <div className="flex items-center gap-2 px-4 md:px-6 py-3 border-b border-border shrink-0 bg-card">
        <Plane className="w-4 h-4 text-primary" />
        <h1 className="text-sm font-semibold text-foreground">Bloqueios Aéreos</h1>
      </div>
      <iframe
        src={embedUrl}
        className="flex-1 w-full border-0"
        title="Bloqueios Aéreos"
        allow="clipboard-read; clipboard-write"
      />
    </div>
  )
}
