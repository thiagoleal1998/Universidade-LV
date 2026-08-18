// Slugs legíveis pra URL de curso/módulo/aula (ex.: "curso-de-ia-na-pratica")
// — sem 'use server' de propósito, usado tanto em Server Components/actions
// quanto no script de backfill avulso. Módulo/aula compõem o texto com o
// nome do PAI antes de chamar slugify() (decisão do usuário, reduz colisão
// na raiz sem precisar de rota aninhada — ver histórico de "vários módulos
// chamados Introdução em cursos diferentes" já documentado em CLAUDE.md).

const COMBINING_MARKS = /[̀-ͯ]/g

// Remove acento via NFD + strip de combining marks (cobre PT-BR sem tabela
// manual de substituição). Colapsa qualquer sequência não-alfanumérica num
// hífen só, apara as pontas, e limita o tamanho pra não gerar URL absurda
// pra título muito longo.
export function slugify(input: string, maxLength = 80): string {
  const base = input
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '') // reapara caso o slice corte no meio de um hífen
  return base || 'item' // título só com símbolo/emoji, sem nenhum alfanumérico
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Teste de formato puro (não valida existência) — usado nas 12 rotas/guards
// pra decidir se o segmento da URL é o UUID antigo (link já persistido em
// notificação/RD Station/push) ou um slug novo.
export function isUuid(value: string): boolean {
  return UUID_RE.test(value)
}

// `existingSlugs` é injetado (não faz query aqui) — a mesma função serve o
// backfill (que já carregou todos os slugs da tabela em memória) e as
// create actions (que fazem 1 query pontual antes do insert). Colisão
// resolvida com sufixo numérico determinístico; a UNIQUE constraint do
// banco é o backstop contra corrida de verdade (ação administrativa de
// baixa concorrência, não precisa de mais que isso).
export function generateUniqueSlug(title: string, existingSlugs: Set<string>, maxLength = 80): string {
  const base = slugify(title, maxLength)
  if (!existingSlugs.has(base)) return base
  let n = 2
  while (existingSlugs.has(`${base}-${n}`)) n++
  return `${base}-${n}`
}
