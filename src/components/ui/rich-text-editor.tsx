'use client'

import { useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Underline from '@tiptap/extension-underline'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Link as LinkIcon,
  Undo,
  Redo,
  ImageIcon,
} from 'lucide-react'
import { useState } from 'react'

interface RichTextEditorProps {
  content: string
  onChange: (value: string) => void
  onImageUpload?: (file: File) => Promise<string | null>
}

export function RichTextEditor({ content, onChange, onImageUpload }: RichTextEditorProps) {
  const imgInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingImg, setIsUploadingImg] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      TiptapImage.configure({
        inline: false,
        allowBase64: false,
        HTMLAttributes: { class: 'rounded-lg max-w-full' },
      }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-[200px] rich-text focus:outline-none p-3',
      },
    },
  })

  if (!editor) return null

  function setLink() {
    const url = window.prompt('URL do link:')
    if (url) editor?.chain().focus().setLink({ href: url }).run()
  }

  async function handleImageFile(file: File) {
    if (!onImageUpload || !editor) return
    setIsUploadingImg(true)
    try {
      const url = await onImageUpload(file)
      if (url) editor.chain().focus().setImage({ src: url }).run()
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
    { icon: LinkIcon,     action: setLink,                                                      active: editor.isActive('link'),                 label: 'Link' },
    { icon: Undo,         action: () => editor.chain().focus().undo().run(),                    active: false,                                   label: 'Desfazer' },
    { icon: Redo,         action: () => editor.chain().focus().redo().run(),                    active: false,                                   label: 'Refazer' },
  ]

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex flex-wrap gap-1 p-2 border-b bg-muted/40">
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
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
