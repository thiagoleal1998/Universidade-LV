// Resolve um link de vídeo (YouTube ou Vimeo) pra uma URL de embed — usado
// pela página de detalhe de Famtour/Evento. Qualquer outro link (Instagram,
// TikTok, etc.) não tem embed real possível sem a API paga/autenticada da
// respectiva plataforma — o chamador deve cair num botão "Assistir vídeo"
// que abre o link original em nova aba nesse caso (retorno null).
//
// Não reaproveita src/lib/youtube.ts de propósito: aquele helper é usado em
// vários lugares que já funcionam (extractYouTubeId, sem suporte a
// /shorts/), e tocar nele pra generalizar arriscaria regressão fora do
// escopo desta mudança. Este é um helper novo, só pra este caso de uso.
export type VideoEmbed = { type: 'youtube' | 'vimeo'; embedUrl: string }

function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function extractVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
  return m ? m[1] : null
}

export function getVideoEmbed(url: string | null | undefined): VideoEmbed | null {
  if (!url) return null
  const youtubeId = extractYouTubeId(url)
  if (youtubeId) return { type: 'youtube', embedUrl: `https://www.youtube.com/embed/${youtubeId}` }
  const vimeoId = extractVimeoId(url)
  if (vimeoId) return { type: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vimeoId}` }
  return null
}
