'use client'

import { useState } from 'react'
import { Users, Building2, Tag as TagIcon } from 'lucide-react'
import { PendingMembers } from '@/components/admin/pending-members'
import { RejectedMembers } from '@/components/admin/rejected-members'
import { MembersTable, type MemberWithEmail } from '@/components/admin/members-table'
import { TagsManager } from '@/components/admin/tags-manager'
import { CollaboratorAreasManager } from '@/components/admin/collaborator-areas-manager'
import type { CollaboratorArea } from '@/app/actions/collaborator-areas'
import { cn } from '@/lib/utils'

type Tab = 'membros' | 'areas' | 'tags'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'membros', label: 'Membros', icon: Users },
  { id: 'areas', label: 'Áreas de Colaborador', icon: Building2 },
  { id: 'tags', label: 'Gerenciar Tags', icon: TagIcon },
]

type StatusTab = 'active' | 'inactive' | 'rejected'

type Tag = { id: string; name: string; color: string }
type Course = { id: string; name: string }
type PendingMember = { id: string; full_name: string; email: string; created_at: string; avatar_url?: string }

export function MembrosTabs({
  pending,
  rejected,
  inactive,
  active,
  allTags,
  allCourses,
  areas,
}: {
  pending: PendingMember[]
  rejected: PendingMember[]
  inactive: MemberWithEmail[]
  active: MemberWithEmail[]
  allTags: Tag[]
  allCourses: Course[]
  areas: CollaboratorArea[]
}) {
  const [tab, setTab] = useState<Tab>('membros')
  const [statusTab, setStatusTab] = useState<StatusTab>('active')

  const statusTabs: { id: StatusTab; label: string; count: number }[] = [
    { id: 'active', label: 'Ativos', count: active.length },
    { id: 'inactive', label: 'Inativos', count: inactive.length },
    { id: 'rejected', label: 'Recusados', count: rejected.length },
  ]

  return (
    <>
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit mb-6 flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
              tab === id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'membros' && (
        <>
          {/* Fila de aprovação: banner de ação, sempre visível quando há algo
              pendente — não é uma "lista pra navegar", some sozinha quando
              vazia (PendingMembers já retorna null nesse caso). */}
          <PendingMembers members={pending} courses={allCourses} allTags={allTags} allAreas={areas} />

          {/* Sub-seção de status: Ativos/Inativos/Recusados são vistas
              separadas, não um filtro a mais — reduz a poluição de mostrar
              as 3 listas empilhadas na mesma tela o tempo todo. */}
          <div className="flex gap-1 border-b border-border mb-4">
            {statusTabs.map(({ id, label, count }) => (
              <button
                key={id}
                onClick={() => setStatusTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  statusTab === id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  statusTab === id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {statusTab === 'active' && (
            <div className="bg-card border rounded-lg overflow-hidden">
              <MembersTable members={active} allTags={allTags} allCourses={allCourses} allAreas={areas} />
            </div>
          )}

          {statusTab === 'inactive' && (
            <div className="bg-card border rounded-lg overflow-hidden">
              <MembersTable
                members={inactive}
                allTags={allTags}
                allCourses={allCourses}
                allAreas={areas}
                emptyMessage="Nenhum membro inativo. Membros aparecem aqui quando são desativados (Editar → Status) depois de já terem sido aprovados."
              />
            </div>
          )}

          {statusTab === 'rejected' && <RejectedMembers members={rejected} />}
        </>
      )}

      {tab === 'areas' && <CollaboratorAreasManager areas={areas} />}

      {tab === 'tags' && <TagsManager tags={allTags} />}
    </>
  )
}
