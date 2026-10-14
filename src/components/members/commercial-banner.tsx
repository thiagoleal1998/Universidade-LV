import Link from 'next/link'
import { ChevronRight, Clock } from 'lucide-react'
import { ATTENTION_COLOR } from '@/components/ui/highlight-badge'
import { CountdownTimer } from '@/components/ui/countdown-timer'
import type { CommercialBannerData } from '@/lib/commercial-banner'

// Compartilhado entre /dashboard/comercial e a home do aluno (pedido do
// usuário: o banner de campanha ativo também precisa aparecer no topo da
// home, não só na aba Comercial) — clique sempre leva pra
// /dashboard/comercial/campanha, nunca um link externo configurável.
export function CommercialBanner({ banner, className }: { banner: CommercialBannerData; className?: string }) {
  return (
    <div className={className ?? 'space-y-4'}>
      {banner.title && (
        <h2 className="text-xl md:text-2xl font-bold text-foreground">{banner.title}</h2>
      )}
      <Link href="/dashboard/comercial/campanha" className="group block relative rounded-2xl overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.image_url}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-64 sm:h-80 md:h-96 lg:h-[28rem] object-cover group-hover:opacity-95 transition-opacity"
          style={{ objectPosition: `center ${banner.image_position}%` }}
        />
        <div className="absolute inset-x-0 bottom-0 flex flex-col">
          {banner.countdown_until && (
            <div className="flex items-center justify-center gap-2 px-4 py-1.5 bg-black/60 text-white text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              Encerra em:
              <CountdownTimer until={banner.countdown_until} boxClassName="bg-white/20" />
            </div>
          )}
          <div
            className="flex items-center justify-center gap-1.5 px-4 py-2 text-white text-sm font-semibold"
            style={{ backgroundColor: ATTENTION_COLOR }}
          >
            Clique e veja as condições especiais
            <ChevronRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
      {banner.description && (
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{banner.description}</p>
      )}
    </div>
  )
}
