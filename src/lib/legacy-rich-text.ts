// `commercial_conditions.description` passou de texto simples (Textarea, com
// `\n` renderizado via `whitespace-pre-wrap`) pra HTML (RichTextEditor) —
// descrições já salvas ANTES dessa mudança são texto puro, sem tag nenhuma.
// Sem esse fallback, jogar esse texto puro direto num `dangerouslySetInnerHTML`
// faz o HTML colapsar qualquer quebra de linha existente num espaço só (o
// mesmo bug de "\n vira espaço" já documentado várias vezes neste projeto,
// só que aqui a causa é migração de formato, não falta de `whitespace-pre-wrap`
// num campo que já era HTML desde sempre). Detecta se já tem tag de bloco
// (o RichTextEditor sempre envolve em `<p>`/`<ul>`/etc.) — se não tiver,
// escapa e troca `\n` por `<br>`, reproduzindo visualmente o que
// `whitespace-pre-wrap` fazia antes, até o admin reabrir e resalvar.
const HTML_BLOCK_TAG_RE = /<(p|ul|ol|li|h[1-3]|blockquote|br|div)[\s>]/i

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export function toRichHtml(value: string): string {
  if (HTML_BLOCK_TAG_RE.test(value)) return value
  return escapeHtml(value).replace(/\n/g, '<br>')
}
