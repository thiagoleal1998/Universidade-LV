import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // NUNCA usar o `origin` de `new URL(request.url)` aqui — atrás do proxy
  // reverso da VPS ele reflete o endereço INTERNO (localhost:3000), não o
  // domínio público, porque o nginx não repassa Host/X-Forwarded-* (mesmo
  // gotcha já documentado no CLAUDE.md). Bug real: um redirect de recuperação
  // de senha em produção mandava o usuário pra `https://localhost:3000/...`.
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://universidadelv.com.br'
  return NextResponse.redirect(`${siteUrl}${next}`)
}
