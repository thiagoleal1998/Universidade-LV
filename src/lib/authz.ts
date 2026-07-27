// Utilitários de autorização server-side (NÃO é arquivo de server actions —
// sem 'use server' de propósito, para não expor os helpers como endpoints).
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { CAPABILITIES, type Capability } from '@/lib/capabilities'
import { PREVIEW_COOKIE } from '@/lib/preview'

// Contexto de autorização do painel /admin. Admin tem todas as capacidades;
// colaborador tem as da sua área (collaborator_areas.capabilities). Member ou
// colaborador sem área/inativo → null (sem acesso ao painel).
export type AdminContext = {
  userId: string
  role: 'admin' | 'collaborator'
  areaId: string | null // null para admin
  capabilities: Capability[]
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (!user) {
    // DIAG TEMPORÁRIO (v1.102.9) — remover após identificar a causa.
    const jar = await cookies()
    const sb = jar.getAll().filter((c) => c.name.startsWith('sb-'))
    const detalhes = sb.map((c) => {
      try {
        const raw = c.value.startsWith('base64-') ? c.value.slice(7) : c.value
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
        const exp = parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : '?'
        const venceu = parsed.expires_at ? (parsed.expires_at * 1000 < Date.now()) : '?'
        const at = typeof parsed.access_token === 'string' ? `${parsed.access_token.length}b` : 'AUSENTE'
        return `${c.name}[${c.value.length}b chaves={${Object.keys(parsed).join(',')}} access_token=${at} expira=${exp} venceu=${venceu} temRefresh=${!!parsed.refresh_token} user=${parsed.user?.id?.slice(0, 8) ?? 'SEM'}]`
      } catch (e) {
        return `${c.name}[${c.value.length}b ILEGIVEL: ${(e as Error).message.slice(0, 60)} ini="${c.value.slice(0, 16)}"]`
      }
    })
    console.error('[DIAG-A] sem user | erro:', authErr?.message ?? '-',
      '| status:', authErr?.status ?? '-',
      '| qtd:', sb.length, '|', detalhes.join(' | ') || 'NENHUM')

    // Testa o access_token do cookie DIRETO na API, fora do client de cookies:
    // se funcionar, o token é bom e o problema é a leitura do cookie; se
    // falhar, a sessão foi revogada no servidor.
    try {
      const c = sb[0]
      if (c) {
        const raw = c.value.startsWith('base64-') ? c.value.slice(7) : c.value
        const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'))
        if (parsed.access_token) {
          const probe = createAdminClient()
          const { data: probeData, error: probeErr } = await probe.auth.getUser(parsed.access_token)
          console.error('[DIAG-D] token do cookie testado direto na API ->',
            probeData?.user ? `VÁLIDO (user ${probeData.user.id.slice(0, 8)})` : `INVÁLIDO: ${probeErr?.message} (status ${probeErr?.status})`)
        }
      }
    } catch (e) {
      console.error('[DIAG-D] falha ao testar token:', (e as Error).message)
    }
    return null
  }

  const adminClient = createAdminClient()
  const { data: profile, error: profErr } = await adminClient
    .from('profiles')
    .select('role, active, collaborator_area_id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // DIAG TEMPORÁRIO (v1.102.8) — remover após identificar a causa.
    console.error('[DIAG-B] user OK mas SEM PERFIL | userId:', user.id,
      '| email:', user.email, '| erro:', profErr?.message ?? '-')
    return null
  }

  // DIAG TEMPORÁRIO (v1.102.8) — remover após identificar a causa.
  if (profile.role !== 'admin') {
    console.error('[DIAG-C] perfil encontrado mas NÃO é admin | userId:', user.id,
      '| email:', user.email, '| role:', JSON.stringify(profile.role),
      '| active:', profile.active)
  }

  if (profile.role === 'admin') {
    return { userId: user.id, role: 'admin', areaId: null, capabilities: [...CAPABILITIES] }
  }

  if (profile.role === 'collaborator' && profile.active && profile.collaborator_area_id) {
    const { data: area } = await adminClient
      .from('collaborator_areas')
      .select('capabilities')
      .eq('id', profile.collaborator_area_id)
      .single()
    if (!area) return null

    const caps = (area.capabilities ?? []).filter((c: string): c is Capability =>
      (CAPABILITIES as readonly string[]).includes(c)
    )
    return { userId: user.id, role: 'collaborator', areaId: profile.collaborator_area_id, capabilities: caps }
  }

  return null
}

export async function requireAdmin(): Promise<AdminContext | { error: string }> {
  const ctx = await getAdminContext()
  if (!ctx || ctx.role !== 'admin') return { error: 'Apenas admins podem fazer isso.' }
  return ctx
}

export async function requireCapability(cap: Capability): Promise<AdminContext | { error: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Sem permissão.' }
  if (ctx.role === 'admin') return ctx
  if (!ctx.capabilities.includes(cap)) return { error: 'Sua área não tem permissão para isso.' }
  return ctx
}

export async function requireAnyCapability(caps: Capability[]): Promise<AdminContext | { error: string }> {
  const ctx = await getAdminContext()
  if (!ctx) return { error: 'Sem permissão.' }
  if (ctx.role === 'admin') return ctx
  if (!caps.some((c) => ctx.capabilities.includes(c))) return { error: 'Sua área não tem permissão para isso.' }
  return ctx
}

// Capacidade + posse: admin passa sempre; colaborador precisa da capacidade E
// o conteúdo precisa pertencer à área dele (owner_area_id). Conteúdo global
// (owner_area_id null) é só do admin.
export async function requireContentAccess(
  cap: Capability,
  ownerAreaId: string | null
): Promise<AdminContext | { error: string }> {
  const ctx = await requireCapability(cap)
  if ('error' in ctx) return ctx
  if (ctx.role === 'admin') return ctx
  if (ownerAreaId !== ctx.areaId) return { error: 'Este conteúdo pertence a outra área.' }
  return ctx
}

export async function requireCourseAccess(courseId: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: course } = await adminClient.from('courses').select('owner_area_id').eq('id', courseId).single()
  if (!course) return { error: 'Curso não encontrado.' }
  return requireContentAccess('courses', course.owner_area_id)
}

export async function requireModuleAccess(moduleId: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: mod } = await adminClient.from('modules').select('course_id').eq('id', moduleId).single()
  if (!mod) return { error: 'Módulo não encontrado.' }
  if (!mod.course_id) return requireAdmin() // módulo sem curso = global, só admin
  return requireCourseAccess(mod.course_id)
}

export async function requireLessonAccess(lessonId: string): Promise<AdminContext | { error: string }> {
  const adminClient = createAdminClient()
  const { data: lesson } = await adminClient.from('lessons').select('module_id').eq('id', lessonId).single()
  if (!lesson) return { error: 'Aula não encontrada.' }
  return requireModuleAccess(lesson.module_id)
}

// Versões para uso no topo de páginas server — redirecionam em vez de retornar erro.
export async function requirePageCapability(caps: Capability | Capability[]): Promise<AdminContext> {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/dashboard')
  if (ctx.role === 'admin') return ctx
  const wanted = Array.isArray(caps) ? caps : [caps]
  if (!wanted.some((c) => ctx.capabilities.includes(c))) redirect('/admin')
  return ctx
}

export async function requireAdminPage(): Promise<AdminContext> {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/dashboard')
  if (ctx.role !== 'admin') redirect('/admin')
  return ctx
}

// Guard de página de CONTEÚDO (Cursos/Marketing): qualquer admin ou colaborador
// ativo pode entrar — a visibilidade de conteúdo deixou de depender de
// capacidade (colaborador vê tudo; só EDITAR continua exigindo
// capacidade+posse, checado em requireContentAccess/require*Access nas
// actions de mutação). getAdminContext() != null já é garantido pelo layout,
// mas cada página revalida por padrão do projeto.
export async function requireContentPage(): Promise<AdminContext> {
  const ctx = await getAdminContext()
  if (!ctx) redirect('/dashboard')
  return ctx
}

// Guards de página de DETALHE — só confirmam que a entidade existe (404-like).
// Não bloqueiam mais por posse: colaborador abre detalhe de conteúdo de
// qualquer área, em modo leitura (a página calcula `canEdit` comparando
// owner_area_id com ctx.areaId, e os componentes escondem os controles de
// mutação quando canEdit é false — a mutação em si continua protegida pelos
// guards de ACTION, que não mudaram).
export async function requireCoursePage(courseId: string): Promise<AdminContext> {
  const ctx = await requireContentPage()
  if (ctx.role === 'admin') return ctx
  const adminClient = createAdminClient()
  const { data } = await adminClient.from('courses').select('id').eq('id', courseId).single()
  if (!data) redirect('/admin/cursos')
  return ctx
}

export async function requireModulePage(moduleId: string): Promise<AdminContext> {
  const ctx = await requireContentPage()
  if (ctx.role === 'admin') return ctx
  const adminClient = createAdminClient()
  const { data: mod } = await adminClient.from('modules').select('id').eq('id', moduleId).single()
  if (!mod) redirect('/admin/modulos')
  return ctx
}

export async function requireLessonPage(lessonId: string): Promise<AdminContext> {
  const ctx = await requireContentPage()
  if (ctx.role === 'admin') return ctx
  const adminClient = createAdminClient()
  const { data: lesson } = await adminClient.from('lessons').select('id').eq('id', lessonId).single()
  if (!lesson) redirect('/admin/modulos')
  return ctx
}

// Contexto "efetivo" pra cálculo de canEdit/canCreate/canModerate nas telas
// de conteúdo (Cursos/Módulos/Aulas/Marketing/Comunidade) — reflete o modo
// prévia de colaborador (cookie com o id da área) quando ativo, simulando
// exatamente o que um colaborador daquela área veria/poderia editar.
// **Nunca** usar isto nos guards de ACTION (requireCourseAccess etc.) — só
// pra decidir o que mostrar na tela. Passe o ctx real (de requireContentPage/
// requireCoursePage/etc.) como entrada; a saída é ou o mesmo ctx (sem prévia
// ativa, ou usuário já é colaborador de verdade) ou um ctx sintético de
// colaborador com a área escolhida.
export async function getPreviewAreaContext(ctx: AdminContext): Promise<AdminContext> {
  if (ctx.role !== 'admin') return ctx
  const jar = await cookies()
  const previewAreaId = jar.get(PREVIEW_COOKIE)?.value
  if (!previewAreaId) return ctx

  const adminClient = createAdminClient()
  const { data: area } = await adminClient
    .from('collaborator_areas')
    .select('capabilities')
    .eq('id', previewAreaId)
    .single()
  if (!area) return ctx

  const caps = (area.capabilities ?? []).filter((c: string): c is Capability =>
    (CAPABILITIES as readonly string[]).includes(c)
  )
  return { userId: ctx.userId, role: 'collaborator', areaId: previewAreaId, capabilities: caps }
}
