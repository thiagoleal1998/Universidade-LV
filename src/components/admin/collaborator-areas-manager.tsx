'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  createCollaboratorArea,
  updateCollaboratorArea,
  deleteCollaboratorArea,
  type CollaboratorArea,
} from '@/app/actions/collaborator-areas'
import { CAPABILITIES, CAPABILITY_LABELS, type Capability } from '@/lib/capabilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Briefcase, Pencil, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function CapabilityCheckboxes({
  selected,
  onToggle,
}: {
  selected: Capability[]
  onToggle: (cap: Capability) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CAPABILITIES.map((cap) => {
        const active = selected.includes(cap)
        return (
          <button
            key={cap}
            type="button"
            onClick={() => onToggle(cap)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
              active
                ? 'bg-primary/10 border-primary/40 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {CAPABILITY_LABELS[cap]}
          </button>
        )
      })}
    </div>
  )
}

function AreaForm({
  initial,
  onDone,
}: {
  initial?: CollaboratorArea
  onDone: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(initial?.name ?? '')
  const [caps, setCaps] = useState<Capability[]>(initial?.capabilities ?? [])
  const [isSaving, startSave] = useTransition()

  function toggle(cap: Capability) {
    setCaps((p) => (p.includes(cap) ? p.filter((c) => c !== cap) : [...p, cap]))
  }

  function handleSave() {
    startSave(async () => {
      const r = initial
        ? await updateCollaboratorArea(initial.id, name, caps)
        : await createCollaboratorArea(name, caps)
      if (r?.error) toast.error(r.error)
      else {
        toast.success(initial ? 'Área atualizada!' : 'Área criada!')
        onDone()
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-muted/40 border border-dashed rounded-lg p-4 space-y-3">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da área (ex: Comercial Nacional, Aéreo...)"
        className="text-sm"
      />
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">O que esta área pode criar e editar:</p>
        <CapabilityCheckboxes selected={caps} onToggle={toggle} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={isSaving || !name.trim() || caps.length === 0} className="gap-1.5">
          {isSaving ? <Spinner className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {initial ? 'Salvar' : 'Criar área'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone} className="gap-1.5">
          <X className="w-3.5 h-3.5" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function CollaboratorAreasManager({ areas }: { areas: CollaboratorArea[] }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(id: string, name: string) {
    setDeletingId(id)
    const r = await deleteCollaboratorArea(id)
    setDeletingId(null)
    if (r?.error) toast.error(r.error)
    else { toast.success(`Área "${name}" removida.`); router.refresh() }
  }

  return (
    <div className="bg-card border rounded-lg p-5 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Áreas de Colaborador</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Colaboradores criam e editam apenas o conteúdo da própria área. Defina aqui o que cada área pode fazer.
      </p>

      <div className="space-y-2 mb-4">
        {areas.length === 0 && !showCreate && (
          <p className="text-xs text-muted-foreground italic">Nenhuma área criada ainda.</p>
        )}
        {areas.map((area) =>
          editingId === area.id ? (
            <AreaForm key={area.id} initial={area} onDone={() => setEditingId(null)} />
          ) : (
            <div key={area.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{area.name}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {area.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-[10px]">
                      {CAPABILITY_LABELS[cap] ?? cap}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => setEditingId(area.id)} title="Editar área">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" disabled={deletingId === area.id} />}>
                    {deletingId === area.id ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir área?</AlertDialogTitle>
                      <AlertDialogDescription>
                        A área <strong>{area.name}</strong> será excluída. Colaboradores dela perdem o acesso ao painel
                        e o conteúdo criado pela área passa a ser gerenciado apenas pelos admins.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(area.id, area.name)}>Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )
        )}
      </div>

      {showCreate ? (
        <AreaForm onDone={() => setShowCreate(false)} />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Nova área
        </Button>
      )}
    </div>
  )
}
