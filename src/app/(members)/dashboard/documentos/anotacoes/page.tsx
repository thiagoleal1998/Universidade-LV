import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NotebookPen, ArrowRight } from 'lucide-react'

export const metadata = { title: 'Minhas Anotações' }

export default async function AnotacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notesRaw } = await supabase
    .from('lesson_notes')
    .select('lesson_id, content, updated_at')
    .eq('user_id', user.id)
    .neq('content', '')
    .order('updated_at', { ascending: false })

  const rawNotes = (notesRaw ?? []) as { lesson_id: string; content: string; updated_at: string }[]

  // Busca títulos das aulas em query separada (evita depender de FK registrada)
  const lessonIds = rawNotes.map((n) => n.lesson_id)
  const { data: lessonsData } = lessonIds.length > 0
    ? await supabase.from('lessons').select('id, title').in('id', lessonIds)
    : { data: [] }

  const lessonMap = new Map((lessonsData ?? []).map((l: { id: string; title: string }) => [l.id, l.title]))

  const notes = rawNotes.map((n) => ({
    ...n,
    lessonTitle: lessonMap.get(n.lesson_id) ?? 'Aula sem título',
  }))

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <NotebookPen className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <p className="font-medium text-foreground">Nenhuma anotação ainda</p>
        <p className="text-sm text-muted-foreground mt-1">
          Suas anotações feitas durante as aulas aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{notes.length} {notes.length === 1 ? 'anotação' : 'anotações'}</p>

      {notes.map((note) => (
          <div key={note.lesson_id} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate">
                  {note.lessonTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Atualizado em {new Date(note.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              <Link
                href={`/dashboard/aulas/${note.lesson_id}?tab=anotacoes`}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
              >
                Ir para aula
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed line-clamp-6">
                {note.content}
              </p>
            </div>
          </div>
      ))}
    </div>
  )
}
