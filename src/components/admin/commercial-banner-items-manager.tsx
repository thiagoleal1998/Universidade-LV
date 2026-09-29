'use client'

import { useState, useRef, useTransition } from 'react'
import {
  createCommercialBannerItem, updateCommercialBannerItem, deleteCommercialBannerItem,
  reorderCommercialBannerItems, uploadCommercialBannerItemLogo,
} from '@/app/actions/commercial-banner-items'
import type { CommercialBannerItem } from '@/app/actions/commercial-banner-items'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LogoChip, DEFAULT_LOGO_BG } from '@/components/ui/logo-chip'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Upload, Lock, Table2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Lista de parceiros exibida na página "planilha" pra onde o banner de
// campanha leva ao ser clicado — separada dos cards de Condições Comerciais
// de propósito (decisão do usuário), mesmo padrão visual de FaqManager
// (lista + form inline de adicionar/editar).
export function CommercialBannerItemsManager({ items: initialItems, canEdit = true }: { items: CommercialBannerItem[]; canEdit?: boolean }) {
  const [items, setItems] = useState<CommercialBannerItem[]>(initialItems)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createCommercialBannerItem(formData)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Parceiro adicionado!')
      setShowAdd(false)
      // Usa o id REAL devolvido pela action — um id temporário local faria
      // qualquer edição/reorder/exclusão seguinte (sem reload) chamar a
      // action com um id que não existe no banco, afetando 0 linhas em
      // silêncio (bug real encontrado testando).
      setItems((prev) => [...prev, {
        id: result.id ?? `temp-${Date.now()}`,
        partner_name: (formData.get('partner_name') as string) ?? '',
        condition_text: (formData.get('condition_text') as string) ?? '',
        logo_url: (formData.get('logo_url') as string) ?? '',
        order_index: prev.length,
        created_at: new Date().toISOString(),
      }])
    })
  }

  function handleUpdate(id: string, formData: FormData) {
    startTransition(async () => {
      const result = await updateCommercialBannerItem(id, formData)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Atualizado!')
      setEditingId(null)
      setItems((prev) => prev.map((item) => item.id === id ? {
        ...item,
        partner_name: (formData.get('partner_name') as string) ?? '',
        condition_text: (formData.get('condition_text') as string) ?? '',
        logo_url: (formData.get('logo_url') as string) ?? '',
      } : item))
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCommercialBannerItem(id)
      if (result?.error) { toast.error(result.error); return }
      toast.success('Removido!')
      setItems((prev) => prev.filter((item) => item.id !== id))
    })
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    const next = [...items]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setItems(next)
    startTransition(async () => {
      await reorderCommercialBannerItems(next.map((item) => item.id))
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 mb-6">
      {!canEdit && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-sm text-amber-800 dark:text-amber-300">
          <Lock className="w-4 h-4 shrink-0" />
          Sua área não tem permissão para alterar os parceiros da campanha — fale com um admin.
        </div>
      )}
      <fieldset disabled={!canEdit} className="space-y-3 border-0 p-0 m-0">
        <div className="flex items-center gap-2">
          <Table2 className="w-4 h-4 text-primary" />
          <p className="font-semibold text-foreground">Parceiros da campanha</p>
        </div>
        <p className="text-xs text-muted-foreground -mt-1.5">
          Lista exibida na página que abre quando o aluno clica no banner acima — nome do parceiro, condição especial e logo.
        </p>

        {items.length === 0 && !showAdd && (
          <div className="text-center py-8 border border-dashed rounded-xl text-muted-foreground">
            <p className="text-sm">Nenhum parceiro cadastrado ainda.</p>
          </div>
        )}

        {items.map((item, i) => (
          <BannerItemRow
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
            onMoveUp={() => handleReorder(i, i - 1)}
            onMoveDown={() => handleReorder(i, i + 1)}
          />
        ))}

        {showAdd ? (
          <BannerItemForm onSubmit={handleCreate} onCancel={() => setShowAdd(false)} isPending={isPending} />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(true)} className="gap-2 mt-1">
            <Plus className="w-4 h-4" /> Adicionar parceiro
          </Button>
        )}
      </fieldset>
    </div>
  )
}

function BannerItemRow({
  item, isEditing, isFirst, isLast, isPending,
  onEdit, onCancelEdit, onSave, onDelete, onMoveUp, onMoveDown,
}: {
  item: CommercialBannerItem
  isEditing: boolean
  isFirst: boolean
  isLast: boolean
  isPending: boolean
  onEdit: () => void
  onCancelEdit: () => void
  onSave: (fd: FormData) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  if (isEditing) {
    return <BannerItemForm initial={item} onSubmit={onSave} onCancel={onCancelEdit} isPending={isPending} />
  }

  return (
    <div className="bg-background border rounded-xl px-4 py-3 flex items-start gap-3">
      <div className="flex flex-col gap-0.5 pt-0.5">
        <button type="button" onClick={onMoveUp} disabled={isFirst || isPending} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onMoveDown} disabled={isLast || isPending} className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
      {item.logo_url ? (
        <LogoChip logoUrl={item.logo_url} bgColor={DEFAULT_LOGO_BG} className="w-10 h-10 shrink-0" imgClassName="w-full h-full p-1.5" />
      ) : (
        <div className="w-10 h-10 rounded-lg border border-dashed border-border shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{item.partner_name}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap">{item.condition_text}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
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

function BannerItemForm({
  initial, onSubmit, onCancel, isPending,
}: {
  initial?: CommercialBannerItem
  onSubmit: (fd: FormData) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url || null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx. 8MB). Escolha uma foto menor ou comprima antes de enviar.')
      e.target.value = ''
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    try {
      if (logoFile) {
        setUploading(true)
        const upload = await uploadCommercialBannerItemLogo(logoFile)
        setUploading(false)
        if (upload.error) { toast.error(upload.error); return }
        fd.set('logo_url', upload.url ?? '')
      } else {
        fd.set('logo_url', logoPreview ?? '')
      }
    } catch {
      setUploading(false)
      toast.error('Não foi possível enviar a logo. Tente novamente com uma imagem menor.')
      return
    }
    onSubmit(fd)
  }

  const busy = isPending || uploading

  return (
    <form onSubmit={handleSubmit} className="border border-dashed rounded-xl p-4 space-y-3">
      <p className="text-sm font-medium text-foreground">{initial ? 'Editar parceiro' : 'Novo parceiro'}</p>

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'relative w-14 h-14 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer hover:border-primary/50 transition-colors',
            logoPreview && 'border-solid border-border bg-white'
          )}
          onClick={() => logoInputRef.current?.click()}
        >
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Preview da logo" referrerPolicy="no-referrer" className="w-full h-full object-contain p-1.5" />
          ) : (
            <Upload className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleLogoFileChange} className="hidden" />
          <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} className="gap-1.5 w-fit h-7 text-xs">
            <Upload className="w-3.5 h-3.5" />
            {logoPreview ? 'Trocar logo' : 'Selecionar logo'}
          </Button>
          {logoPreview && (
            <button type="button" onClick={() => { setLogoPreview(null); setLogoFile(null) }} className="text-xs text-muted-foreground hover:text-red-500 transition-colors text-left">
              Remover logo
            </button>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="partner_name" className="text-xs">Nome do parceiro</Label>
        <Input id="partner_name" name="partner_name" defaultValue={initial?.partner_name ?? ''} placeholder="Ex.: Rede Vila Galé" className="mt-1.5" required autoFocus />
      </div>
      <div>
        <Label htmlFor="condition_text" className="text-xs">Condição especial</Label>
        <Textarea id="condition_text" name="condition_text" defaultValue={initial?.condition_text ?? ''} placeholder="Ex.: 15% OFF + parcelamento em 10x sem juros" className="mt-1.5 resize-none" rows={2} />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={busy} className="gap-1.5">
          <Check className="w-3.5 h-3.5" /> {busy ? 'Salvando...' : (initial ? 'Salvar' : 'Adicionar')}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          <X className="w-3.5 h-3.5 mr-1" /> Cancelar
        </Button>
      </div>
    </form>
  )
}
