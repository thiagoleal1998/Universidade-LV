import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/slug'
import { getMyFamtourAccessContext, requestFamtourAccess } from '@/app/actions/famtour-access'
import { isAccessLocked } from '@/lib/access-lock'
import { RequestAccessButton } from '@/components/members/request-access-button'
import { TripMediaSections } from '@/components/members/trip-media-sections'
import { ArrowLeft, ExternalLink, Calendar, Luggage } from 'lucide-react'

function formatPeriod(start: string | null, end: string | null): string {
  if (!start) return ''
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  }
  if (end && end !== start) return `${fmt(start)} — ${fmt(end)}`
  return fmt(start)
}

export default async function FamtourDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // RLS de famtours é admin-only — leitura pro membro sempre via adminClient,
  // mesmo padrão já usado na home. Dual lookup: link antigo (UUID já
  // persistido em notificação/etc.) continua resolvendo depois do backfill
  // de slug.
  const adminClient = createAdminClient()
  const { data: item } = await adminClient
    .from('famtours')
    .select('*, photos:famtour_photos(*), testimonials:famtour_testimonials(*)')
    .eq(isUuid(id) ? 'id' : 'slug', id)
    .eq('is_active', true)
    .single()
  if (!item) notFound()

  const accessCtx = await getMyFamtourAccessContext()
  const requestStatus = accessCtx.requestsByFamtourId[item.id] ?? 'none'
  const locked = isAccessLocked(item, accessCtx.uf, requestStatus)

  const photos = (item.photos ?? [])
    .slice()
    .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)
    .map((p: { id: string; storage_path: string; caption: string }) => ({
      id: p.id,
      caption: p.caption,
      url: adminClient.storage.from('marketing-files').getPublicUrl(p.storage_path).data.publicUrl,
    }))
  const testimonials = (item.testimonials ?? [])
    .slice()
    .sort((a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index)

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <Link
        href="/dashboard/famtours"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar para Famtours
      </Link>

      <div className="relative rounded-2xl overflow-hidden mb-6 bg-muted">
        {item.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.cover_url} alt={item.title} className="w-full aspect-video object-cover" />
        ) : (
          <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Luggage className="w-20 h-20 text-primary/20" />
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">{item.title}</h1>
          {(item.start_date || item.end_date) && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 shrink-0" />
              {formatPeriod(item.start_date, item.end_date)}
            </span>
          )}
          {item.description && (
            <p className="text-muted-foreground leading-relaxed">{item.description}</p>
          )}
        </div>

        {/* Exclusivo sem acesso liberado: substitui TODOS os blocos abaixo —
            vídeo, galeria e depoimentos são conteúdo exclusivo, não algo à
            parte (mesma regra já aplicada a treinamento). */}
        {locked ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5">
            <RequestAccessButton onRequest={requestFamtourAccess.bind(null, item.id)} exclusiveUfs={item.exclusive_ufs} status={requestStatus} />
          </div>
        ) : (
          <>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
              >
                <Luggage className="w-4 h-4" />
                Link de inscrição / detalhes
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            )}

            <TripMediaSections videoUrl={item.video_url} photos={photos} testimonials={testimonials} />
          </>
        )}
      </div>
    </div>
  )
}
