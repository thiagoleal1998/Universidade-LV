'use client'

import { useState, useTransition } from 'react'
import { createTag, deleteTag, updateTag } from '@/app/actions/tags'
import { TAG_COLOR_PRESETS, isValidHex, resolveTagHex } from '@/lib/tag-colors'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { TagChip } from '@/components/admin/tag-chip'
import { toast } from 'sonner'
import { Plus, Trash2, Tags, Pencil, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tag = { id: string; name: string; color: string }

// Paleta de atalhos + input nativo de cor (paleta do SO) + campo de hex direto
// — as 3 formas escrevem no mesmo state, que é o que vai salvo em tags.color.
function ColorPicker({ color, onChange, swatchSize = 'w-6 h-6' }: { color: string; onChange: (hex: string) => void; swatchSize?: string }) {
  const resolved = resolveTagHex(color)
  const [hexInput, setHexInput] = useState(resolved)

  function commitHex(value: string) {
    setHexInput(value)
    if (isValidHex(value)) onChange(value)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex gap-1.5">
        {TAG_COLOR_PRESETS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => { onChange(c.hex); setHexInput(c.hex) }}
            title={c.key}
            style={{ background: c.hex }}
            className={cn(
              'rounded-full transition-all shrink-0', swatchSize,
              resolved.toLowerCase() === c.hex ? 'ring-2 ring-offset-1 ring-foreground scale-110' : 'opacity-70 hover:opacity-100'
            )}
          />
        ))}
      </div>
      <input
        type="color"
        value={resolved}
        onChange={(e) => { onChange(e.target.value); setHexInput(e.target.value) }}
        className="w-7 h-7 rounded cursor-pointer border border-border p-0 bg-transparent"
        title="Escolher na paleta"
      />
      <input
        type="text"
        value={hexInput}
        onChange={(e) => commitHex(e.target.value)}
        placeholder="#3b82f6"
        maxLength={7}
        className="w-20 text-xs border border-border rounded-lg px-2 py-1 bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      />
    </div>
  )
}

function TagEditInline({ tag, onDone }: { tag: Tag; onDone: () => void }) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const [isSaving, startSave] = useTransition()

  function handleSave() {
    if (!name.trim()) return
    startSave(async () => {
      const result = await updateTag(tag.id, name, color)
      if (result?.error) toast.error(result.error)
      else { toast.success('Tag atualizada!'); onDone() }
    })
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap bg-muted/50 border rounded-lg px-2.5 py-1.5">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onDone() }}
        className="bg-transparent text-xs font-medium text-foreground w-28 outline-none border-b border-border focus:border-primary"
        autoFocus
      />
      <ColorPicker color={color} onChange={setColor} swatchSize="w-4 h-4" />
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !name.trim()}
        className="text-green-600 hover:text-green-700 disabled:opacity-40"
        title="Salvar"
      >
        {isSaving ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onDone}
        className="text-muted-foreground hover:text-foreground"
        title="Cancelar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function TagsManager({ tags }: { tags: Tag[] }) {
  const [selectedColor, setSelectedColor] = useState<string>(TAG_COLOR_PRESETS[0].hex)
  const [isCreating, startCreate] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('color', selectedColor)
    const form = e.currentTarget
    startCreate(async () => {
      const result = await createTag(fd)
      if (result?.error) toast.error(result.error)
      else { toast.success('Tag criada!'); form.reset() }
    })
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id)
    const result = await deleteTag(id)
    setDeletingId(null)
    if (result?.error) toast.error(result.error)
    else toast.success(`Tag "${name}" removida.`)
  }

  return (
    <div className="bg-card border rounded-lg p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Tags className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Gerenciar Tags</h3>
      </div>

      {/* Existing tags */}
      <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
        {tags.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Nenhuma tag criada ainda.</p>
        )}
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-0.5 group">
            {editingId === tag.id ? (
              <TagEditInline tag={tag} onDone={() => setEditingId(null)} />
            ) : (
              <>
                <TagChip tag={tag} />
                <button
                  onClick={() => setEditingId(tag.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground ml-0.5"
                  title="Editar tag"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleDelete(tag.id, tag.name)}
                  disabled={deletingId === tag.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500 ml-0.5"
                  title="Remover tag"
                >
                  {deletingId === tag.id
                    ? <Spinner className="w-3 h-3" />
                    : <Trash2 className="w-3 h-3" />
                  }
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Create tag form */}
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <Input name="name" placeholder="Nome da tag (ex: RH, Financeiro...)" required className="text-sm" />
        </div>
        <ColorPicker color={selectedColor} onChange={setSelectedColor} />
        <Button type="submit" size="sm" disabled={isCreating} className="gap-1.5">
          {isCreating ? <Spinner className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          Criar tag
        </Button>
      </form>
    </div>
  )
}
