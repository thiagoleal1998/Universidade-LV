import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { CheckCircle2, ChevronRight, Eye, Lock, ArrowLeft } from 'lucide-react'
import { ModuleCompletionBanner } from '@/components/members/module-certificate'
import { cn } from '@/lib/utils'
import type { Module, Lesson } from '@/lib/supabase/types'

type LessonRow = Pick<Lesson, 'id' | 'title' | 'is_published' | 'order_index'>
type ModuleWithLessons = Module & { lessons: LessonRow[] }

export default async function ModulePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single()

  const isAdmin = profile?.role === 'admin'

  // Admin usa cliente sem RLS para ver rascunhos; membro usa cliente normal
  const client = isAdmin ? createAdminClient() : supabase

  const { data: mod } = await client
    .from('modules')
    .select('*, lessons(id, title, is_published, order_index)')
    .eq('id', id)
    .order('order_index', { referencedTable: 'lessons' })
    .single() as { data: ModuleWithLessons | null }

  if (!mod) notFound()

  // Membro não pode ver módulo despublicado
  if (!isAdmin && !mod.is_published) notFound()

  // Check prerequisite for members
  let prereqTitle: string | null = null
  if (!isAdmin && mod.prerequisite_module_id) {
    const { data: prereqMod } = await client
      .from('modules')
      .select('id, title, lessons(id, is_published)')
      .eq('id', mod.prerequisite_module_id)
      .eq('is_published', true)
      .single()

    if (prereqMod) {
      const { data: prereqProgress } = await supabase
        .from('member_progress')
        .select('lesson_id')
        .eq('user_id', user.id)

      const completedIds = new Set((prereqProgress ?? []).map((p) => p.lesson_id))
      const publishedLessons = (prereqMod.lessons as { id: string; is_published: boolean }[]).filter((l) => l.is_published)
      const allDone = publishedLessons.length > 0 && publishedLessons.every((l) => completedIds.has(l.id))

      if (!allDone) {
        prereqTitle = (prereqMod as { title: string }).title
      }
    }
  }

  const [{ data: progressData }, { data: certData }] = await Promise.all([
    supabase.from('member_progress').select('lesson_id, completed_at').eq('user_id', user.id),
    supabase.from('certificates').select('id').eq('user_id', user.id).eq('module_id', id).eq('status', 'approved').maybeSingle(),
  ])

  const completedSet = new Set((progressData ?? []).map((p) => p.lesson_id))
  const visibleLessons = mod.lessons.filter((l) => isAdmin || l.is_published)
  const publishedLessons = mod.lessons.filter((l) => l.is_published)
  const completedCount = publishedLessons.filter((l) => completedSet.has(l.id)).length
  const lastCompleted = (progressData ?? [])
    .filter((p) => publishedLessons.find((l) => l.id === p.lesson_id))
    .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())[0]
  const progress = publishedLessons.length > 0
    ? Math.round((completedCount / publishedLessons.length) * 100)
    : 0

  const isDraft = !mod.is_published

  // Locked state for members who haven't completed the prerequisite
  if (prereqTitle) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <Lock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">{mod.title}</h2>
          <p className="text-muted-foreground mb-6">
            Este módulo está bloqueado. Conclua <strong>{prereqTitle}</strong> primeiro para ter acesso.
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}>
            <ArrowLeft className="w-4 h-4" />
            Voltar para meus cursos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Banner de prévia */}
      {isAdmin && isDraft && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl px-4 py-3 text-sm font-medium">
          <Eye className="w-4 h-4 shrink-0" />
          Modo prévia — este módulo ainda não foi publicado e não está visível para os membros.
        </div>
      )}

      {/* Cabeçalho */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-foreground">{mod.title}</h1>
          {isAdmin && (
            <Badge variant={isDraft ? 'secondary' : 'default'} className="text-xs">
              {isDraft ? 'Rascunho' : 'Publicado'}
            </Badge>
          )}
        </div>
        {mod.description && (
          <p className="text-muted-foreground text-sm mt-1">{mod.description}</p>
        )}

        {/* Progresso */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>{completedCount} de {publishedLessons.length} aulas concluídas</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Lista de aulas */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {visibleLessons.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            Nenhuma aula disponível neste módulo.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {visibleLessons.map((lesson) => {
              const done = completedSet.has(lesson.id)
              const isLessonDraft = !lesson.is_published
              return (
                <Link
                  key={lesson.id}
                  href={`/dashboard/aulas/${lesson.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    {done ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                    )}
                    <span className={`text-sm ${isLessonDraft ? 'text-muted-foreground' : 'text-green-600'}`}>
                      {lesson.title}
                    </span>
                    {isAdmin && isLessonDraft && (
                      <Badge variant="secondary" className="text-[10px] py-0">rascunho</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Banner de conclusão */}
      {!isAdmin && progress === 100 && publishedLessons.length > 0 && (
        <ModuleCompletionBanner hasCertificate={!!certData} />
      )}

      {isAdmin && (
        <div className="text-center">
          <Link
            href={`/admin/modulos/${mod.id}`}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para edição
          </Link>
        </div>
      )}
    </div>
  )
}
