import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Callback OAuth2 do app "ULV" (App Publisher da RD Station). Só é acionado
// manualmente, uma vez, ao (re)autorizar o app — não faz parte do fluxo normal
// de uso da plataforma. Recebe o `code` (uso único, expira em minutos), troca
// por access_token/refresh_token e grava em `rdstation_tokens` (tabela sem
// nenhuma policy de leitura via sessão — só adminClient). Fora do gate de
// login do proxy.ts de propósito (ver comentário lá).
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'sem code na query' }, { status: 400 })

  const clientId = process.env.RDSTATION_CLIENT_ID
  const clientSecret = process.env.RDSTATION_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'RDSTATION_CLIENT_ID/SECRET não configurados' }, { status: 500 })
  }

  const res = await fetch('https://api.rd.services/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'falha ao trocar code por token', status: res.status, body: await res.text() }, { status: 502 })
  }

  const json = await res.json()
  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString()

  const adminClient = createAdminClient()
  const { error } = await adminClient.from('rdstation_tokens').upsert({
    id: 1,
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expires_at: expiresAt,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true, expires_at: expiresAt })
}
