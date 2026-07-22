import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getAdminContext } from '@/lib/authz'
import { createAdminClient } from '@/lib/supabase/admin'
import { PREVIEW_COOKIE } from '@/lib/preview'

// GET (não Server Action) de propósito: o "Prévia como Colaborador" abre
// isso numa aba NOVA via window.open — se fosse uma Server Action chamada
// pela aba original, o Next.js atualizaria automaticamente os dados da aba
// original também (comportamento intrínseco do App Router: invocar uma
// action sempre revalida a página que a chamou, mesmo sem revalidatePath/
// router.refresh() explícito), quebrando o isolamento entre as duas abas.
// Como é uma navegação HTTP de verdade só na aba nova, a original nunca é
// tocada. `?area=<id>` ativa a prévia daquela área; sem `area` (ou área
// inválida), limpa o cookie — usado tanto pra ativar (aba nova) quanto pra
// sair (mesma aba da prévia, via window.location.href).
export async function GET(request: NextRequest) {
  const ctx = await getAdminContext()
  const jar = await cookies()

  if (ctx?.role === 'admin') {
    const areaId = request.nextUrl.searchParams.get('area')
    if (areaId) {
      const adminClient = createAdminClient()
      const { data: area } = await adminClient.from('collaborator_areas').select('id').eq('id', areaId).single()
      if (area) jar.set(PREVIEW_COOKIE, areaId, { httpOnly: true, sameSite: 'lax', path: '/' })
    } else {
      jar.delete(PREVIEW_COOKIE)
    }
  }

  return NextResponse.redirect(new URL('/admin', request.url))
}
