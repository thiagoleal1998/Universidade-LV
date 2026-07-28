'use client'

import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { Callout, type CalloutVariant } from '@/components/ui/rich-text-callout'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  ListChecks,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  ImageIcon,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react'
import { useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (value: string) => void
  onImageUpload?: (file: File) => Promise<string | null>
  editable?: boolean
  // Habilita os blocos de destaque (aviso/dica/checklist) do formato Manual
  // interativo. Desligado por padrão porque o RichTextEditor é compartilhado
  // com o membro (chamados de feedback): sem o gate, (a) os botões poluiriam
  // a UI de um chamado, e (b) o HTML gerado (`data-callout`) seria descartado
  // em silêncio pelo `sanitizeRichText` (isomorphic-dompurify) do lado do
  // servidor — bloco sumiria sem aviso nenhum pro autor.
  blocks?: boolean
}

// Tags que o editor de fato entende — tudo fora daqui é "desembrulhado" (o
// texto de dentro sobe um nível, a tag em si some) em vez de ser inserido
// como está.
const PASTE_ALLOWED_TAGS = new Set([
  'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'A', 'IMG',
])
const PASTE_ALLOWED_ATTRS: Record<string, string[]> = {
  A: ['href'],
  IMG: ['src', 'alt'],
}

// Blocos ricos (callout/checklist) são identificados pelo atributo
// discriminante, não pela tag sozinha — DIV/UL/LI genéricos continuam sendo
// desembrulhados como antes (não reabre o bug do toolbar colado dentro do
// editor, já que aquele <div> não tem `data-callout`). `class` continua
// descartado de tudo, inclusive destes: o Tiptap regenera a classe visual
// (`callout`, etc.) sozinho ao re-serializar o nó — só o atributo que
// discrimina o tipo do bloco precisa sobreviver ao parse do paste.
function isRichBlock(el: Element): boolean {
  return (
    (el.tagName === 'DIV' && el.hasAttribute('data-callout')) ||
    (el.tagName === 'UL' && el.getAttribute('data-type') === 'taskList') ||
    (el.tagName === 'LI' && el.getAttribute('data-type') === 'taskItem')
  )
}
const BLOCK_ALLOWED_ATTRS: Record<string, string[]> = {
  DIV: ['data-callout'],
  UL: ['data-type'],
  LI: ['data-type', 'data-checked'],
}

// Cola de qualquer origem — inclusive selecionar um trecho da própria página
// (que pode abranger a barra de ferramentas e o miolo de OUTRO editor rico
// aberto ao lado) — carrega o HTML bruto de origem, com classes e tudo.
// Sem isso, o Tiptap tenta honrar essa estrutura, e um <div> com as mesmas
// classes Tailwind do nosso próprio toolbar aparece renderizado dentro do
// editor de destino como se fosse um segundo editor embutido (bug real:
// colar uma seleção que cobria a área de outra resposta reproduzia a
// barra de ferramentas inteira, com botões, dentro do texto).
function sanitizePastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  function clean(node: ParentNode) {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element
        const richBlock = isRichBlock(el)
        if (!PASTE_ALLOWED_TAGS.has(el.tagName) && !richBlock) {
          // Desembrulha: promove os filhos pro lugar do elemento removido,
          // sem perder o texto que estava dentro.
          while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el)
          el.remove()
        } else {
          const keep = new Set(richBlock ? BLOCK_ALLOWED_ATTRS[el.tagName] ?? [] : PASTE_ALLOWED_ATTRS[el.tagName] ?? [])
          Array.from(el.attributes).forEach((attr) => {
            if (!keep.has(attr.name)) el.removeAttribute(attr.name)
          })
          clean(el)
        }
      } else if (child.nodeType !== Node.TEXT_NODE) {
        child.remove() // comentários, etc.
      }
    })
  }

  clean(doc.body)
  return doc.body.innerHTML
}

export function RichTextEditor({ content, onChange, onImageUpload, editable = true, blocks = false }: RichTextEditorProps) {
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImg, setIsUploadingImg] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      // Sem botão de toolbar pra criar link manualmente: o `autolink` (ligado
      // por padrão nesta extensão) já transforma qualquer URL digitada em
      // link real — o botão exigia selecionar um trecho de texto antes pra
      // ter efeito visível, e sem isso (uso comum) não fazia nada, sem
      // nenhum aviso pro autor.
      Link.configure({ openOnClick: false }),
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
      }),
      // Schema idêntico ao de hoje quando `blocks` está desligado — um
      // callout colado num editor sem essa extensão é descartado pelo
      // próprio ProseMirror (comportamento correto pro chamado de feedback).
      ...(blocks ? [Callout, TaskList, TaskItem.configure({ nested: true })] : []),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[200px] rich-text focus:outline-none p-3',
      },
      // Colar (Ctrl+V) uma imagem do clipboard, ou arrastar um arquivo, sem
      // este handler, cai no comportamento padrão do Tiptap: como
      // `allowBase64: false`, a imagem colada é descartada/inserida sem src
      // — aparece como ícone de imagem quebrada, sem erro nenhum no console.
      // Interceptamos antes disso e subimos pelo mesmo onImageUpload do botão.
      handlePaste: (_view, event) => {
        if (!onImageUpload) return false
        const item = Array.from(event.clipboardData?.items ?? []).find((it) => it.type.startsWith('image/'))
        const file = item?.getAsFile()
        if (!file) return false
        event.preventDefault()
        handleImageFile(file)
        return true
      },
      handleDrop: (_view, event) => {
        if (!onImageUpload) return false
        const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'))
        if (files.length === 0) return false
        event.preventDefault()
        files.forEach((f) => handleImageFile(f))
        return true
      },
      transformPastedHTML: sanitizePastedHtml,
    },
  })

  if (!editor) return null

  async function handleImageFile(file: File) {
    if (!onImageUpload || !editor) return
    setIsUploadingImg(true)
    try {
      const url = await onImageUpload(file)
      if (url) editor.chain().focus().setImage({ src: url }).run()
      else toast.error('Não foi possível inserir a imagem.')
    } finally {
      setIsUploadingImg(false)
    }
  }

  const toolbar = [
    { icon: Bold,          action: () => editor.chain().focus().toggleBold().run(),              active: editor.isActive('bold'),                 label: 'Negrito' },
    { icon: Italic,        action: () => editor.chain().focus().toggleItalic().run(),            active: editor.isActive('italic'),               label: 'Itálico' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(),         active: editor.isActive('underline'),             label: 'Sublinhado' },
    { icon: Heading2,     action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), label: 'Título 2' },
    { icon: Heading3,     action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), label: 'Título 3' },
    { icon: List,         action: () => editor.chain().focus().toggleBulletList().run(),        active: editor.isActive('bulletList'),           label: 'Lista' },
    { icon: ListOrdered,  action: () => editor.chain().focus().toggleOrderedList().run(),       active: editor.isActive('orderedList'),          label: 'Lista numerada' },
    { icon: Quote,        action: () => editor.chain().focus().toggleBlockquote().run(),        active: editor.isActive('blockquote'),           label: 'Citação' },
    { icon: Undo,         action: () => editor.chain().focus().undo().run(),                    active: false,                                   label: 'Desfazer' },
    { icon: Redo,         action: () => editor.chain().focus().redo().run(),                    active: false,                                   label: 'Refazer' },
  ]

  const setCallout = (variant: CalloutVariant) => editor.chain().focus().toggleCallout(variant).run()
  const blockToolbar = blocks
    ? [
        { icon: AlertTriangle, action: () => setCallout('aviso'), active: editor.isActive('callout', { variant: 'aviso' }), label: 'Aviso' },
        { icon: Lightbulb,     action: () => setCallout('dica'),  active: editor.isActive('callout', { variant: 'dica' }),  label: 'Dica' },
        { icon: ListChecks,    action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList'), label: 'Checklist' },
      ]
    : []

  return (
    // Sem overflow-hidden aqui: esse overflow (mesmo sem barra de rolagem
    // visível) vira a "âncora de rolagem" do CSS pra qualquer sticky lá
    // dentro — como este próprio div nunca rola (quem rola é a página por
    // trás dele), o toolbar sticky ficava preso sem nunca "grudar" no topo
    // de verdade. O arredondamento do card sai daqui e vai pros dois filhos
    // (canto de cima no toolbar, canto de baixo no conteúdo).
    <div className="border rounded-lg">
      {editable && (
      // Com o chamado muito longo, o toolbar ficava lá em cima e exigia
      // rolar de volta até o topo pra formatar algo mais abaixo. Sticky
      // mantém a barra visível no topo da tela enquanto o usuário rola
      // pelo conteúdo — a "ancestral de rolagem" é a própria página na
      // maioria dos usos, ou o modal/dialog que estiver por volta.
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/95 backdrop-blur-sm sticky top-0 z-10 rounded-t-lg">
        {toolbar.map(({ icon: Icon, action, active, label }) => (
          <Button
            key={label}
            type="button"
            variant={active ? 'default' : 'ghost'}
            size="icon"
            className="w-8 h-8"
            onClick={action}
            title={label}
          >
            <Icon className="w-3.5 h-3.5" />
          </Button>
        ))}

        {onImageUpload && (
          <>
            <div className="w-px h-6 bg-border self-center mx-0.5" />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="w-8 h-8"
              title="Inserir imagem"
              disabled={isUploadingImg}
              onClick={() => imgInputRef.current?.click()}
            >
              {isUploadingImg
                ? <Spinner className="w-3.5 h-3.5" />
                : <ImageIcon className="w-3.5 h-3.5" />
              }
            </Button>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) { handleImageFile(file); e.target.value = '' }
              }}
            />
          </>
        )}

        {blockToolbar.length > 0 && (
          <>
            <div className="w-px h-6 bg-border self-center mx-0.5" />
            {blockToolbar.map(({ icon: Icon, action, active, label }) => (
              <Button
                key={label}
                type="button"
                variant={active ? 'default' : 'ghost'}
                size="icon"
                className="w-8 h-8"
                onClick={action}
                title={label}
              >
                <Icon className="w-3.5 h-3.5" />
              </Button>
            ))}
          </>
        )}
      </div>
      )}
      <EditorContent editor={editor} className="rounded-b-lg overflow-hidden" />
    </div>
  )
}
