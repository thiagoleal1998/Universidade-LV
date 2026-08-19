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
import type { MemberWithEmail } from '@/components/admin/members-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { Plus, Trash2, Briefcase, Pencil, X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

function initialsOf(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
}

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

function AreaMembersDialog({
  area,
  members,
  onClose,
}: {
  area: CollaboratorArea
  members: MemberWithEmail[]
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            {area.name}
          </DialogTitle>
        </DialogHeader>

        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground italic py-4">
            Nenhum colaborador nesta área ainda.
          </p>
        ) : (
          <div className="space-y-1.5 overflow-y-auto pr-1">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors">
                <Avatar className="w-8 h-8 shrink-0">
                  {m.avatar_url && <AvatarImage src={m.avatar_url} alt={m.full_name} />}
                  <AvatarFallback className="text-xs">{initialsOf(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{m.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                {!m.active && (
                  <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">Inativo</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function CollaboratorAreasManager({ areas, members }: { areas: CollaboratorArea[]; members: MemberWithEmail[] }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingArea, setViewingArea] = useState<CollaboratorArea | null>(null)

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
        {areas.map((area) => {
          const areaMembers = members.filter((m) => m.role === 'collaborator' && m.collaborator_area_id === area.id)
          return editingId === area.id ? (
            <AreaForm key={area.id} initial={area} onDone={() => setEditingId(null)} />
          ) : (
            <div key={area.id} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5">
              <button
                type="button"
                onClick={() => setViewingArea(area)}
                className="min-w-0 flex-1 text-left rounded-md -m-1 p-1 hover:bg-muted/60 transition-colors"
                title="Ver colaboradores desta área"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{area.name}</p>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <Users className="w-3 h-3" />
                    {areaMembers.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {area.capabilities.map((cap) => (
                    <Badge key={cap} variant="outline" className="text-[10px]">
                      {CAPABILITY_LABELS[cap] ?? cap}
                    </Badge>
                  ))}
                </div>
              </button>
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
        })}
      </div>

      {viewingArea && (
        <AreaMembersDialog
          area={viewingArea}
          members={members.filter((m) => m.role === 'collaborator' && m.collaborator_area_id === viewingArea.id)}
          onClose={() => setViewingArea(null)}
        />
      )}

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
