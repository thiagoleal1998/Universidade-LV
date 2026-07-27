// Extensão Tiptap para blocos de destaque (aviso/dica/importante) usados no
// editor de aula quando `blocks` está habilitado (ver rich-text-editor.tsx).
// Gera `<div data-callout="aviso"><p>...</p></div>` — o título visual
// ("⚠ Atenção" etc.) vem de `::before` no CSS (globals.css), não do HTML,
// pra poder renomear rótulos sem precisar migrar conteúdo salvo.
import { Node, mergeAttributes } from '@tiptap/core'

export type CalloutVariant = 'aviso' | 'dica' | 'importante'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: (variant: CalloutVariant) => ReturnType
    }
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'dica',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-callout') ?? 'dica',
        renderHTML: (attrs: { variant: string }) => ({ 'data-callout': attrs.variant }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-callout]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      // toggleWrap (não wrapIn): clicar de novo no mesmo botão desfaz o
      // bloco — sem isso o autor ficaria sem como sair do callout pelo
      // próprio botão que o criou.
      toggleCallout:
        (variant: CalloutVariant) =>
        ({ commands }: { commands: { toggleWrap: (name: string, attrs?: Record<string, unknown>) => boolean } }) =>
          commands.toggleWrap(this.name, { variant }),
    }
  },
})
