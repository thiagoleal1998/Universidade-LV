'use client'

import { useState } from 'react'
import { Users, Building2, Tag as TagIcon } from 'lucide-react'
import { PendingMembers } from '@/components/admin/pending-members'
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

type Tag = { id: string; name: string; color: string }
type Course = { id: string; name: string }
type PendingMember = { id: string; full_name: string; email: string; created_at: string; avatar_url?: string }

export function MembrosTabs({
  pending,
  active,
  allTags,
  allCourses,
  areas,
}: {
  pending: PendingMember[]
  active: MemberWithEmail[]
  allTags: Tag[]
  allCourses: Course[]
  areas: CollaboratorArea[]
}) {
  const [tab, setTab] = useState<Tab>('membros')

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
          <PendingMembers members={pending} courses={allCourses} />
          <div className="bg-card border rounded-lg overflow-hidden">
            <MembersTable members={active} allTags={allTags} allCourses={allCourses} allAreas={areas} />
          </div>
        </>
      )}

      {tab === 'areas' && <CollaboratorAreasManager areas={areas} />}

      {tab === 'tags' && <TagsManager tags={allTags} />}
    </>
  )
}
