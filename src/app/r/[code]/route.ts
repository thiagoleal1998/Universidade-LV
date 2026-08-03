import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Encurtador de link genérico — hoje só usado pro e-mail de redefinição de
// senha (a URL de recuperação do Supabase é gigante e a RD Station não aceita
// variável no destino de um link, só texto simples concatenado no corpo).
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://universidadelv.com.br'

  const adminClient = createAdminClient()
  const { data } = await adminClient.from('short_links').select('target_url, expires_at').eq('code', code).single()

  if (!data || new Date(data.expires_at) < new Date()) {
    return NextResponse.redirect(`${siteUrl}/forgot-password`)
  }

  return NextResponse.redirect(data.target_url)
}
