// Log de atividades administrativas — não é arquivo de server actions
// (sem 'use server' de propósito), chamado de dentro das actions.
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminContext } from '@/lib/authz'

export const ACTIVITY_ACTIONS = ['create', 'update', 'delete', 'toggle', 'upload', 'reorder'] as const
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number]

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  create: 'criou',
  update: 'editou',
  delete: 'excluiu',
  toggle: 'alterou status de',
  upload: 'enviou arquivo em',
  reorder: 'reordenou',
}

export const ACTIVITY_ENTITY_LABELS = {
  curso: 'Curso',
  modulo: 'Módulo',
  aula: 'Aula',
  tarefa_aula: 'Tarefa de aula',
  pergunta_aula: 'Pergunta de aula',
  treinamento: 'Treinamento',
  material_treinamento: 'Material de treinamento',
  produto_marketing: 'Produto de marketing',
  periodo_marketing: 'Período de marketing',
  item_marketing: 'Item de marketing',
  premiacao: 'Configuração de premiação',
  famtour: 'Famtour',
  grupo: 'Grupo',
  condicao_comercial: 'Condição comercial',
  membro: 'Membro',
  tag: 'Tag',
  area_colaborador: 'Área de colaborador',
  configuracao_site: 'Configuração do site',
  comunicado: 'Comunicado',
  post_comunidade: 'Post da comunidade',
  resposta_comunidade: 'Resposta da comunidade',
  feedback: 'Chamado de feedback',
  seo: 'SEO',
  faq: 'Pergunta frequente',
  certificado: 'Certificado',
  configuracao_certificado: 'Configuração de certificado',
  template_email: 'Template de e-mail',
} as const
export type ActivityEntityType = keyof typeof ACTIVITY_ENTITY_LABELS

// Fire-and-forget de propósito: NUNCA usar `await` nos call sites (mesmo
// padrão de notifyAllAdmins() chamado sem await em community.ts) — o log não
// pode atrasar nem quebrar a mutação principal. O try/catch aqui dentro é a
// segunda camada de proteção, para o caso de alguém chamar com await mesmo assim.
export async function logActivity(
  ctx: AdminContext,
  params: {
    action: ActivityAction
    entityType: ActivityEntityType
    entityLabel: string
    entityId?: string | null
    detail?: string | null
  }
): Promise<void> {
  try {
    const adminClient = createAdminClient()
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .single()

    await adminClient.from('admin_activity_log').insert({
      actor_id: ctx.userId,
      actor_name: profile?.full_name || '',
      actor_role: ctx.role,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel,
      detail: params.detail ?? null,
    })
  } catch {
    // Nunca deixa o log quebrar a mutação principal.
  }
}

// Compara "antes" (linha do banco) com "depois" (payload novo) pelas chaves
// declaradas em fieldLabels e devolve os rótulos legíveis dos campos que
// mudaram. Comparação por igualdade estrita — o chamador deve normalizar os
// dois lados (trim, null vs '', etc.) do mesmo jeito que faz antes de gravar.
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fieldLabels: Record<string, string>
): string[] {
  const changed: string[] = []
  for (const [key, label] of Object.entries(fieldLabels)) {
    if (before[key] !== after[key]) changed.push(label)
  }
  return changed
}
