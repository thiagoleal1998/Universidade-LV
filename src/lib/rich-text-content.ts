// HTML do RichTextEditor "sem conteúdo de verdade" — só tags vazias tipo
// <p></p>, sem texto e sem imagem. Usado tanto pra habilitar botão de
// enviar quanto pra decidir se vale a pena salvar como rascunho.
export function isRichTextEmpty(html: string): boolean {
  if (/<img[\s/]/i.test(html)) return false
  return !html.replace(/<[^>]*>/g, '').trim()
}
