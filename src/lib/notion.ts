import { Client } from '@notionhq/client'

const apiKey = process.env.NOTION_API_KEY
const dataSourceId = process.env.NOTION_CHAMADOS_DATA_SOURCE_ID
const notion = apiKey ? new Client({ auth: apiKey }) : null

export type FeedbackStatus = 'open' | 'in_progress' | 'resolved'

const STATUS_LABEL: Record<FeedbackStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em andamento',
  resolved: 'Resolvido',
}

const TYPE_LABEL = { bug: 'Bug', suggestion: 'Sugestão' } as const

function escapeForNotion(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function brDateISO(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
}

function brDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso)).replace(', ', ' ')
}

function brDateShort(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso)).replace(', ', ' ')
}

// Linhas da tabela Timeline, no mesmo formato (emoji + texto) já estabelecido
// manualmente para os chamados sincronizados antes desta automação existir.
export function timelineRowCreated(authorName: string): string {
  return `🟢 **Chamado aberto** por ${escapeForNotion(authorName)}`
}

export function timelineRowAssigned(assignedName: string | null): string {
  return assignedName
    ? `👤 **Atribuído** a ${escapeForNotion(assignedName)}`
    : `👤 **Atribuição removida**`
}

export function timelineRowStatusChanged(from: FeedbackStatus, to: FeedbackStatus): string {
  const icon = to === 'resolved' ? '✅' : '🔄'
  return `${icon} Status: ${STATUS_LABEL[from]} → **${STATUS_LABEL[to]}**`
}

export function timelineRowNote(actorName: string, notePreview: string): string {
  return `💬 **${escapeForNotion(actorName)}** respondeu: "${escapeForNotion(notePreview.slice(0, 200))}"`
}

function buildCreateMarkdown(params: {
  authorName: string
  createdAtIso: string
  messageText: string
  pageUrl: string
}): string {
  return [
    '# Mensagem original',
    `> **${escapeForNotion(params.authorName)}** — ${brDateTime(params.createdAtIso)}`,
    `> ${escapeForNotion(params.messageText)}`,
    `**Página onde ocorreu:** \`${params.pageUrl}\``,
    '# Timeline',
    '<table header-row="true">',
    '<tr>',
    '<td>Quando</td>',
    '<td>Evento</td>',
    '</tr>',
    '<tr>',
    `<td>${brDateShort(params.createdAtIso)}</td>`,
    `<td>${timelineRowCreated(params.authorName)}</td>`,
    '</tr>',
    '</table>',
    '# Resolução',
    'Em aberto, sem resolução ainda.',
  ].join('\n')
}

// Cria a página do chamado na base "Chamados" do Notion e devolve o page_id,
// pra ser gravado em feedback_reports.notion_page_id — sem isso, os próximos
// eventos (atribuição/status/resposta) não saberiam qual página atualizar.
// No-op silencioso se NOTION_API_KEY/NOTION_CHAMADOS_DATA_SOURCE_ID não
// estiverem configuradas (mesmo padrão de send() em src/lib/email.ts).
export async function notionCreateFeedbackTicket(params: {
  title: string
  type: 'bug' | 'suggestion'
  status: FeedbackStatus
  authorName: string
  messageText: string
  pageUrl: string
  createdAtIso: string
}): Promise<string | null> {
  if (!notion || !dataSourceId) return null
  try {
    const page = await notion.pages.create({
      parent: { data_source_id: dataSourceId },
      properties: {
        'Título': { title: [{ text: { content: params.title || 'Sem título' } }] },
        'Tipo': { select: { name: TYPE_LABEL[params.type] } },
        'Status': { select: { name: STATUS_LABEL[params.status] } },
        'Aberto por': { rich_text: [{ text: { content: params.authorName || 'Desconhecido' } }] },
        'Responsável': { rich_text: [] },
        'Data de abertura': { date: { start: brDateISO(params.createdAtIso) } },
      },
      markdown: buildCreateMarkdown(params),
    })
    return page.id
  } catch (err) {
    console.error('[notion] falha ao criar chamado:', err)
    return null
  }
}

export async function notionUpdateFeedbackStatus(pageId: string | null, status: FeedbackStatus): Promise<void> {
  if (!notion || !pageId) return
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: { 'Status': { select: { name: STATUS_LABEL[status] } } },
    })
  } catch (err) {
    console.error('[notion] falha ao atualizar status:', err)
  }
}

export async function notionUpdateFeedbackAssignee(pageId: string | null, assignedName: string): Promise<void> {
  if (!notion || !pageId) return
  try {
    await notion.pages.update({
      page_id: pageId,
      properties: { 'Responsável': { rich_text: assignedName ? [{ text: { content: assignedName } }] : [] } },
    })
  } catch (err) {
    console.error('[notion] falha ao atualizar responsável:', err)
  }
}

// Anexa uma linha na tabela Timeline via edição de markdown (busca a única
// ocorrência de "</table>" na página e insere a linha nova antes dela) — evita
// ter que localizar o block_id da tabela nativa do Notion via API de blocks.
export async function notionAppendTimelineRow(pageId: string | null, whenIso: string, eventText: string): Promise<void> {
  if (!notion || !pageId) return
  try {
    const row = `<tr>\n<td>${brDateShort(whenIso)}</td>\n<td>${eventText}</td>\n</tr>\n</table>`
    await notion.pages.updateMarkdown({
      page_id: pageId,
      type: 'update_content',
      update_content: { content_updates: [{ old_str: '</table>', new_str: row }] },
    })
  } catch (err) {
    console.error('[notion] falha ao anexar linha na timeline:', err)
  }
}
