// Extensão Tiptap: colar um link de vídeo (YouTube/Vimeo/Instagram) sozinho
// no corpo do texto vira um embed de verdade, não um link autolinkado sem
// preview. Mesmo padrão de `rich-text-callout.ts` (Node atômico, sem
// `'use client'` — puxa `getVideoEmbed` de `src/lib/video.ts`, que também
// não tem diretiva nenhuma). Habilitada só onde `RichTextEditor` recebe
// `videoEmbeds` — pedido do usuário limitado ao "Texto adicional" de
// Famtour/Evento, não em todo editor rico do projeto (chamados de feedback
// inclusos).
import { Node, mergeAttributes } from '@tiptap/core'
import { getVideoEmbed } from '@/lib/video'

export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      url: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('data-video-url'),
        renderHTML: (attrs: { url: string }) => ({ 'data-video-url': attrs.url }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-video-embed]' }]
  },

  // O HTML gerado aqui é o mesmo que sai de `editor.getHTML()` — como a
  // exibição final usa `dangerouslySetInnerHTML`, o <iframe> já funciona
  // direto na página do membro, sem nenhum componente React adicional no
  // lado da leitura. Link não reconhecido (não deveria acontecer, já que só
  // entra via paste já validado) cai num <a> normal como salvaguarda.
  renderHTML({ HTMLAttributes, node }) {
    const url = node.attrs.url as string
    const embed = getVideoEmbed(url)
    if (!embed) {
      return ['a', { href: url, target: '_blank', rel: 'noreferrer' }, url]
    }
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-video-embed': '',
        class: 'rich-text-video-embed',
        'data-embed-type': embed.type,
        'data-vertical': embed.vertical ? 'true' : 'false',
      }),
      [
        'iframe',
        {
          src: embed.embedUrl,
          title: 'Vídeo',
          allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
          allowfullscreen: 'true',
        },
      ],
    ]
  },
})
