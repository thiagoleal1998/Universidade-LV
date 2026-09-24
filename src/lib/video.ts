// Resolve um link de vídeo pra uma URL de embed — usado pela página de
// detalhe de Famtour/Evento. Suporta YouTube (normal, youtu.be, /shorts/),
// Vimeo e Instagram (reel/post/tv, via o endpoint público `/embed/` do
// próprio Instagram — a página normal manda X-Frame-Options: DENY, mas
// `/embed/` não, e funciona sem API/token pra conteúdo público). Qualquer
// outro link (TikTok, etc.) retorna null: o chamador cai num botão "Assistir
// vídeo" que abre o link original em nova aba.
//
// `vertical` = formato retrato (Shorts/Reels) — o chamador usa proporção
// 9:16 em vez de 16:9, senão o vídeo vertical fica minúsculo dentro de uma
// caixa horizontal.
//
// Não reaproveita src/lib/youtube.ts de propósito: aquele helper é usado em
// vários lugares que já funcionam (extractYouTubeId, sem suporte a
// /shorts/), e tocar nele pra generalizar arriscaria regressão fora do
// escopo desta mudança. Este é um helper novo, só pra este caso de uso.
export type VideoEmbed = { type: 'youtube' | 'vimeo' | 'instagram'; embedUrl: string; vertical: boolean }

function extractYouTubeId(url: string): { id: string; short: boolean } | null {
  const short = url.match(/youtube\.com\/shorts\/([^?&/]+)/)
  if (short) return { id: short[1], short: true }
  const patterns = [
    /youtube\.com\/watch\?(?:[^#]*&)?v=([^&#]+)/,
    /youtu\.be\/([^?&#/]+)/,
    /youtube\.com\/embed\/([^?&#/]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return { id: m[1], short: false }
  }
  return null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

function extractInstagram(url: string): { kind: string; code: string } | null {
  const m = url.match(/instagram\.com\/(?:[^/?#]+\/)?(reels?|p|tv)\/([A-Za-z0-9_-]+)/)
  if (!m) return null
  return { kind: m[1] === 'reels' ? 'reel' : m[1], code: m[2] }
}

export function getVideoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null
  const yt = extractYouTubeId(url)
  if (yt) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt.id}`, vertical: yt.short }
  const vimeoId = extractVimeoId(url)
  if (vimeoId) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}`, vertical: false }
  const ig = extractInstagram(url)
  if (ig) return { type: 'instagram', embedUrl: `https://www.instagram.com/${ig.kind}/${ig.code}/embed/`, vertical: true }
  return null
}
