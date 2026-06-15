'use client'

import { useState, useTransition } from 'react'
import { createFaqItem, updateFaqItem, deleteFaqItem, toggleFaqItem, reorderFaqItems } from '@/app/actions/faq'
import type { FaqItem } from '@/app/actions/faq'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FaqManager({ initialItems }: { initialItems: FaqItem[] }) {
  const [items, setItems] = useState<FaqItem[]>(initialItems)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createFaqItem(formData)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Pergunta adicionada!')
      setShowAdd(false)
      const q = formData.get('question') as string
      const a = formData.get('answer') as string
      setItems((prev) => [...prev, {
        id: `temp-${Date.now()}`,
        question: q,
        answer: a,
        order_index: prev.length,
        is_active: true,
        created_at: new Date().toISOString(),
      }])
    })
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateFaqItem(id, formData)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Atualizado!')
      setEditingId(null)
      const q = formData.get('question') as string
      const a = formData.get('answer') as string
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, question: q, answer: a } : item))
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteFaqItem(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Removido!')
      setItems((prev) => prev.filter((item) => item.id !== id))
    })
  }

  function handleToggle(id: string, current: boolean) {
    startTransition(async () => {
      const result = await toggleFaqItem(id, !current)
      if (result?.error) { toast.error(result.error); return }
      setItems((prev) => prev.map((item) => item.id === id ? { ...item, is_active: !current } : item))
    })
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    const next = [...items]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setItems(next)
    startTransition(async () => {
      await reorderFaqItems(next.map((item) => item.id))
    })
  }

  return (
    <div className="space-y-3">
      {items.length === 0 && !showAdd && (
        <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground">
          <p className="text-sm">Nenhuma pergunta cadastrada ainda.</p>
          <p className="text-xs mt-1">Clique em "Adicionar pergunta" para começar.</p>
        </div>
      )}

      {items.map((item, i) => (
        <FaqRow
          key={item.id}
          item={item}
          isEditing={editingId === item.id}
          isFirst={i === 0}
          isLast={i === items.length - 1}
          isPending={isPending}
          onEdit={() => setEditingId(item.id)}
          onCancelEdit={() => setEditingId(null)}
          onSave={(fd) => handleUpdate(item.id, fd)}
          onDelete={() => handleDelete(item.id)}
          onToggle={() => handleToggle(item.id, item.is_active)}
          onMoveUp={() => handleReorder(i, i - 1)}
          onMoveDown={() => handleReorder(i, i + 1)}
        />
      ))}

      {showAdd ? (
        <FaqForm
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          isPending={isPending}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-2 mt-2">
          <Plus className="w-4 h-4" /> Adicionar pergunta
        </Button>
      )}
    </div>
  )
}

function FaqRow({
  item, isEditing, isFirst, isLast, isPending,
  onEdit, onCancelEdit, onSave, onDelete, onToggle, onMoveUp, onMoveDown,
}: {
  item: FaqItem
  isEditing: boolean
  isFirst: boolean
  isLast: boolean
  isPending: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (fd: FormData) => void
  onDelete: () => void
  onToggle: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  if (isEditing) {
    return (
      <FaqForm
        initial={item}
        onSubmit={onSave}
        onCancel={onCancelEdit}
        isPending={isPending}
      />
    )
  }

  return (
    <div className={cn('bg-card border rounded-xl px-4 py-3 flex items-start gap-3', !item.is_active && 'opacity-50')}>
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button type="button" onClick={onMoveUp} disabled={isFirst || isPending} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={isLast || isPending} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.question}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.answer}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button type="button" onClick={onToggle} disabled={isPending} title={item.is_active ? 'Desativar' : 'Ativar'} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        <button type="button" onClick={onEdit} disabled={isPending} title="Editar" className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <Pencil className="w-4 h-4" />
        </button>
        <button type="button" onClick={onDelete} disabled={isPending} title="Remover" className="text-muted-foreground hover:text-red-500 transition-colors p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function FaqForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: FaqItem
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    onSubmit(new FormData(e.currentTarget))
  }

  return (
    <form onSubmit={handleSubmit} className="border border-dashed rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{initial ? 'Editar pergunta' : 'Nova pergunta'}</p>
      <div>
        <Label htmlFor="question" className="text-xs">Pergunta</Label>
        <Input id="question" name="question" defaultValue={initial?.question ?? ''} placeholder="Como faço para..." className="mt-1.5" required autoFocus />
      </div>
      <div>
        <Label htmlFor="answer" className="text-xs">Resposta</Label>
        <Textarea id="answer" name="answer" defaultValue={initial?.answer ?? ''} placeholder="Para fazer isso, você deve..." className="mt-1.5 resize-none" rows={3} required />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending} className="gap-1.5">
          <Check className="w-3.5 h-3.5" /> {initial ? 'Salvar' : 'Adicionar'}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
        </Button>
      </div>
    </form>
  )
}
