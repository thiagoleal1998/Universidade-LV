'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EditMemberDialog } from '@/components/admin/edit-member-dialog'
import { TagChip } from '@/components/admin/tag-chip'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMemberCode, getTagColor } from '@/lib/tag-colors'
import { BarChart2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tag = { id: string; name: string; color: string }
type Course = { id: string; name: string }
type Area = { id: string; name: string }

export type MemberWithEmail = {
  id: string
  full_name: string
  role: 'admin' | 'member' | 'collaborator'
  active: boolean
  created_at: string
  email: string
  avatar_url?: string
  member_number?: number | null
  collaborator_area_id?: string | null
  bio?: string
  linkedin_url?: string | null
  uf?: string | null
  city?: string | null
  tagIds?: string[]
  courseIds?: string[]
  isOnline?: boolean
}

type Filter = 'all' | 'admin' | 'collaborator' | 'member'

const FILTER_LABEL: Record<Filter, string> = {
  all: 'Todos os papéis',
  member: 'Membros comuns',
  collaborator: 'Colaboradores',
  admin: 'Admins',
}

export function MembersTable({
  members,
  allTags = [],
  allCourses = [],
  allAreas = [],
  emptyMessage,
}: {
  members: MemberWithEmail[]
  allTags?: Tag[]
  allCourses?: Course[]
  allAreas?: Area[]
  /** Mensagem exibida quando a lista vier vazia sem nenhum filtro aplicado (ex.: aba "Inativos" sem ninguém desativado). */
  emptyMessage?: string
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

    const matchesFilter = filter === 'all' || filter === m.role

    const matchesTag = !tagFilter || (m.tagIds ?? []).includes(tagFilter)

    return matchesSearch && matchesFilter && matchesTag
  })

  const activeTag = allTags.find((t) => t.id === tagFilter)
  const hasActiveFilters = search || filter !== 'all' || tagFilter

  return (
    <div>
      {/* Busca + filtros condensados em 2 selects (papel + tag), em vez de
          uma fileira de botões por opção — reduz a poluição visual da tela. */}
      <div className="flex flex-col sm:flex-row gap-2 p-4 border-b border-border">
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

        <div className="flex gap-2 shrink-0">
          <Select value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue>{(v: Filter) => FILTER_LABEL[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(FILTER_LABEL) as Filter[]).map((key) => (
                <SelectItem key={key} value={key}>{FILTER_LABEL[key]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {allTags.length > 0 && (
            <Select value={tagFilter ?? '__all__'} onValueChange={(v) => setTagFilter(v === '__all__' ? null : v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue>
                  {() => activeTag ? (
                    <span className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={getTagColor(activeTag.color).dotStyle} />
                      {activeTag.name}
                    </span>
                  ) : 'Todas as tags'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas as tags</SelectItem>
                {allTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={getTagColor(tag.color).dotStyle} />
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
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
                {hasActiveFilters
                  ? 'Nenhum membro encontrado com esses filtros.'
                  : (emptyMessage ?? 'Nenhum membro cadastrado ainda.')}
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
                      <div className="relative shrink-0">
                        <Avatar className="w-7 h-7">
                          {member.avatar_url && <AvatarImage src={member.avatar_url} alt={member.full_name} />}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        {member.isOnline && (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card"
                            title="Online agora"
                          />
                        )}
                      </div>
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
                    {/* prefetch desligado: são ~1 link por membro, e cada
                        prefetch renderiza a página de detalhe inteira no
                        servidor. Com o router.refresh() do auto-refresh, a
                        cascata era redisparada a cada ciclo (dezenas de
                        requisições por minuto, com aborts 499 no nginx). */}
                    <Link
                      href={`/admin/membros/${member.id}`}
                      prefetch={false}
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
