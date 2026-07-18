'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditMemberDialog } from '@/components/admin/edit-member-dialog'
import { TagChip } from '@/components/admin/tag-chip'
import { formatMemberCode } from '@/lib/tag-colors'
import { BarChart2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tag = { id: string; name: string; color: string }
type Course = { id: string; name: string }
type Area = { id: string; name: string }

type MemberWithEmail = {
  id: string
  full_name: string
  role: 'admin' | 'member' | 'collaborator'
  active: boolean
  created_at: string
  email: string
  avatar_url?: string
  member_number?: number | null
  collaborator_area_id?: string | null
  tagIds?: string[]
  courseIds?: string[]
}

type Filter = 'all' | 'active' | 'inactive' | 'admin' | 'collaborator'

export function MembersTable({
  members,
  allTags = [],
  allCourses = [],
  allAreas = [],
}: {
  members: MemberWithEmail[]
  allTags?: Tag[]
  allCourses?: Course[]
  allAreas?: Area[]
}) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [tagFilter, setTagFilter] = useState<string | null>(null)

  const filtered = members.filter((m) => {
    const q = search.toLowerCase()
    const matchesSearch = !q ||
      m.full_name?.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      formatMemberCode(m.member_number ?? null).toLowerCase().includes(q)

    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && m.active && m.role !== 'admin') ||
      (filter === 'inactive' && !m.active) ||
      (filter === 'admin' && m.role === 'admin') ||
      (filter === 'collaborator' && m.role === 'collaborator')

    const matchesTag = !tagFilter || (m.tagIds ?? []).includes(tagFilter)

    return matchesSearch && matchesFilter && matchesTag
  })

  const filterOptions: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Ativos' },
    { key: 'inactive', label: 'Inativos' },
    { key: 'collaborator', label: 'Colaboradores' },
    { key: 'admin', label: 'Admins' },
  ]

  return (
    <div>
      {/* Search + filter bar */}
      <div className="flex flex-col gap-3 p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou ID (LV-0001)..."
              className="pl-9 pr-9"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {filterOptions.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={filter === opt.key ? 'default' : 'outline'}
                onClick={() => setFilter(opt.key)}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground shrink-0">Por tag:</span>
            <button
              onClick={() => setTagFilter(null)}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full border transition-colors',
                !tagFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-muted-foreground'
              )}
            >
              Todas
            </button>
            {allTags.map((tag) => (
              <button key={tag.id} onClick={() => setTagFilter(tagFilter === tag.id ? null : tag.id)}>
                <TagChip
                  tag={tag}
                  className={cn('cursor-pointer transition-opacity', tagFilter && tagFilter !== tag.id ? 'opacity-40' : '')}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">ID</TableHead>
            <TableHead>Membro</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cadastrado em</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                {search || filter !== 'all' || tagFilter
                  ? 'Nenhum membro encontrado com esses filtros.'
                  : 'Nenhum membro cadastrado ainda.'}
              </TableCell>
            </TableRow>
          )}
          {filtered.map((member) => {
            const initials = member.full_name
              ? member.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
              : member.email[0]?.toUpperCase() ?? '?'

            const memberTags = allTags.filter((t) => member.tagIds?.includes(t.id))

            return (
              <TableRow key={member.id}>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {formatMemberCode(member.member_number ?? null)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="w-7 h-7">
                        {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} />}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {member.full_name || <span className="text-muted-foreground italic">Sem nome</span>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {memberTags.map((tag) => <TagChip key={tag.id} tag={tag} />)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={member.active ? 'outline' : 'destructive'}
                      className={member.active ? 'text-green-700 border-green-300 bg-green-50 w-fit' : 'w-fit'}>
                      {member.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs w-fit">
                      {member.role === 'admin'
                        ? 'Admin'
                        : member.role === 'collaborator'
                          ? `Colaborador${(() => { const a = allAreas.find((ar) => ar.id === member.collaborator_area_id); return a ? ` · ${a.name}` : '' })()}`
                          : 'Membro'}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(member.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/membros/${member.id}`}
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
                      title="Ver progresso e notas"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </Link>
                    <EditMemberDialog
                      member={member}
                      allTags={allTags}
                      allCourses={allCourses}
                      allAreas={allAreas}
                    />
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right px-4 py-2 border-t border-border">
          {filtered.length} {filtered.length === 1 ? 'membro' : 'membros'} exibido{filtered.length === 1 ? '' : 's'}
          {members.length !== filtered.length && ` de ${members.length}`}
        </p>
      )}
    </div>
  )
}
