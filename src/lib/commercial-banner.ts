export type CommercialBannerData = {
  image_url: string
  image_position: number
  title: string
  description: string
  countdown_until: string
}

// Parser único compartilhado entre /dashboard/comercial e a home do aluno —
// os dois precisam do mesmo settings.commercial_banner (JSON em site_settings),
// e duplicar esse try/catch nos dois Server Components arriscaria os dois
// divergirem silenciosamente se o shape mudar de novo.
export function parseCommercialBanner(raw: string | null | undefined): CommercialBannerData | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed?.active || !parsed?.image_url) return null
    return {
      image_url: parsed.image_url,
      image_position: typeof parsed?.image_position === 'number' ? parsed.image_position : 50,
      title: typeof parsed?.title === 'string' ? parsed.title : '',
      description: typeof parsed?.description === 'string' ? parsed.description : '',
      countdown_until: typeof parsed?.countdown_until === 'string' ? parsed.countdown_until : '',
    }
  } catch {
    return null
  }
}
