import { MapPin, Globe, Gift, ScrollText, Paperclip, ExternalLink, Calendar, Users, PlayCircle } from 'lucide-react'
import { detectIso, flagImgUrl } from '@/lib/flag-detect'
import { detectPremiacaoIcon } from '@/lib/premiacao-icons'
import { getVideoEmbed } from '@/lib/video'

export type Status = 'proxima' | 'em_andamento' | 'finalizada'
export type PremiacaoItem = { texto: string; especificacoes: string }
export type PremiacaoSection = { titulo: string; itens: PremiacaoItem[] }
export type Vencedor = { posicao: string; nome: string; agencia: string; descricao: string; logo_url: string }

export type CorridaData = {
  status: Status
  tipo: 'nacional' | 'internacional'
  exclusivo_grupos: boolean
  titulo: string
  descricao: string
  destino: string
  periodo: string
  parceiro_logo_url: string
  premiacoes: PremiacaoSection[]
  vencedores: Vencedor[]
  regras: string
  lamina_url: string
  video_url: string
}

// Mesma lógica/markup de `SingleVideo` em trip-media-sections.tsx
// (Famtour/Evento) — duplicado de propósito porque aquele componente é
// `'use client'` inteiro (carrossel de depoimentos) e este card precisa
// continuar puro (sem hooks), pra funcionar tanto direto num Server
// Component quanto dentro do Dialog do CorridasVendasGrid.
function CorridaVideo({ videoUrl }: { videoUrl: string }) {
  const embed = getVideoEmbed(videoUrl)

  if (!embed) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        <PlayCircle className="w-4 h-4" />
        Assistir vídeo
        <ExternalLink className="w-3.5 h-3.5 opacity-70" />
      </a>
    )
  }

  const frameClass = embed.type === 'instagram'
    ? 'w-full max-w-[400px] mx-auto h-[640px]'
    : embed.vertical
      ? 'w-full max-w-[340px] mx-auto aspect-[9/16]'
      : 'w-full aspect-video'

  return (
    <div className={`rounded-xl overflow-hidden border border-border bg-black/5 ${frameClass}`}>
      <iframe
        src={embed.embedUrl}
        title="Vídeo"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  )
}

// Conteúdo completo de uma corrida — usado tanto direto na página (formato
// antigo) quanto dentro do Dialog do CorridasVendasGrid (card resumido que
// abre no clique). Sem hooks/state, por isso funciona em Server e Client
// Component sem alteração.
export function CorridaCard({ corrida }: { corrida: CorridaData }) {
  const iso = detectIso(corrida.destino)
  return (
    <div className="space-y-5">
      {corrida.titulo && <h2 className="text-xl font-bold text-foreground">{corrida.titulo}</h2>}

      <div className="flex items-center gap-3 flex-wrap">
        {corrida.tipo === 'nacional' ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold">
            <MapPin className="w-3.5 h-3.5" />Nacional
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 text-sm font-semibold">
            <Globe className="w-3.5 h-3.5" />Internacional
          </span>
        )}
        {corrida.exclusivo_grupos && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-sm font-semibold">
            <Users className="w-3.5 h-3.5" />Exclusivo para Grupos
          </span>
        )}
        {corrida.destino && (
          <span className="flex items-center gap-2 text-lg font-bold text-foreground">
            {iso && <img src={flagImgUrl(iso, '32x24')} srcSet={`${flagImgUrl(iso, '48x36')} 2x`} width={32} height={24} alt="Bandeira" className="rounded-sm object-cover" />}
            {corrida.destino}
          </span>
        )}
      </div>

      {corrida.periodo && (
        corrida.status === 'proxima' ? (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
            <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Data prevista</p>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{corrida.periodo}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>{corrida.periodo}</span>
          </div>
        )
      )}

      {corrida.descricao && corrida.descricao !== '<p></p>' && (
        <div className="rich-text text-muted-foreground" dangerouslySetInnerHTML={{ __html: corrida.descricao }} />
      )}

      {corrida.video_url && <CorridaVideo videoUrl={corrida.video_url} />}

      {corrida.lamina_url && (
        <a href={corrida.lamina_url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors">
          <Paperclip className="w-4 h-4" />
          Ver lâmina da corrida
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </a>
      )}

      {corrida.premiacoes.some((s) => s.itens.length > 0) && (
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground">Premiação</h3>
          {corrida.premiacoes.map((section, sIdx) =>
            section.itens.length === 0 ? null : (
              <div key={sIdx} className="bg-card border rounded-xl p-5 space-y-4">
                {section.titulo && (
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold text-foreground">{section.titulo}</span>
                  </div>
                )}
                <ul className="space-y-3">
                  {section.itens.map((item, idx) => {
                    const Icon = detectPremiacaoIcon(item.texto)
                    return (
                      <li key={idx} className="space-y-1.5">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{item.texto}</span>
                        </div>
                        {item.especificacoes && <p className="text-xs text-muted-foreground ml-10 leading-relaxed">{item.especificacoes}</p>}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ),
          )}
        </div>
      )}

      {corrida.regras && corrida.regras !== '<p></p>' && (
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Regras</h3>
          </div>
          <div className="rich-text" dangerouslySetInnerHTML={{ __html: corrida.regras }} />
        </div>
      )}
    </div>
  )
}
