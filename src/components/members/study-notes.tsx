'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { saveNote, saveNoteDraft, discardNoteDraft } from '@/app/actions/notes'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Check, Loader2, FileClock, Save } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  lessonId: string
  initialContent: string      // última versão salva
  initialDraft?: string       // rascunho pendente, se houver
}

const DRAFT_DEBOUNCE_MS = 1200

export function StudyNotes({ lessonId, initialContent, initialDraft = '' }: Props) {
  // Abre no rascunho quando existe — é o que o aluno estava escrevendo.
  const [content, setContent] = useState(initialDraft || initialContent)
  const [savedContent, setSavedContent] = useState(initialContent)
  const [isSaving, startSave] = useTransition()
  const [justSaved, setJustSaved] = useState(false)
  const [draftPending, setDraftPending] = useState(Boolean(initialDraft))
  // Rascunho que veio do servidor (sessão anterior) e ainda não foi tocado.
  // Separado de draftPending porque este some assim que o aluno digita — daí
  // em diante quem avisa é o "Alterações não salvas" do rodapé.
  const [recoveredDraft, setRecoveredDraft] = useState(Boolean(initialDraft))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setContent(initialDraft || initialContent)
    setSavedContent(initialContent)
    setDraftPending(Boolean(initialDraft))
    setRecoveredDraft(Boolean(initialDraft))
  }, [lessonId, initialContent, initialDraft])

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const isDirty = content !== savedContent

  function handleChange(val: string) {
    setContent(val)
    setJustSaved(false)
    setRecoveredDraft(false)
    // O rascunho continua indo sozinho para o servidor — é o que garante que
    // nada se perde se o aluno fechar a aba. O que mudou é que isso não conta
    // como "salvo" e não aparece em Documentos.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      saveNoteDraft(lessonId, val).then(() => setDraftPending(val !== savedContent))
    }, DRAFT_DEBOUNCE_MS)
  }

  function handleSave() {
    if (timerRef.current) clearTimeout(timerRef.current)
    startSave(async () => {
      const r = await saveNote(lessonId, content)
      if (r?.error) {
        toast.error(r.error)
        return
      }
      setSavedContent(content)
      setDraftPending(false)
      setRecoveredDraft(false)
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2500)
      toast.success('Anotação salva.')
    })
  }

  function handleDiscard() {
    if (timerRef.current) clearTimeout(timerRef.current)
    startSave(async () => {
      const r = await discardNoteDraft(lessonId)
      if (r?.error) {
        toast.error(r.error)
        return
      }
      setContent(savedContent)
      setDraftPending(false)
      setRecoveredDraft(false)
      toast.success('Rascunho descartado.')
    })
  }

  const hasUnsaved = isDirty || draftPending

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Suas anotações pessoais — visíveis apenas para você.{' '}
          <span className="text-xs">
            Clique em Salvar para enviar para{' '}
            <a href="/dashboard/documentos/anotacoes" className="underline hover:text-foreground transition-colors">
              Documentos →
            </a>
          </span>
        </p>
        {justSaved && (
          <span className="flex items-center gap-1 text-xs text-green-600 shrink-0">
            <Check className="w-3 h-3" />
            Salvo
          </span>
        )}
      </div>

      {/* Rascunho recuperado de uma sessão anterior — o aluno precisa saber
          que aquele texto ainda não está valendo. */}
      {recoveredDraft && (
        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <FileClock className="w-3.5 h-3.5 shrink-0" />
          <span>Você tem um rascunho não salvo. Ele não aparece em Documentos até você salvar.</span>
        </div>
      )}

      <Textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escreva suas anotações aqui..."
        className="min-h-48 resize-none font-mono text-sm"
      />

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {hasUnsaved ? 'Alterações não salvas' : savedContent ? 'Tudo salvo' : ''}
        </span>
        <div className="flex items-center gap-2">
          {hasUnsaved && content !== savedContent && (
            <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={isSaving}>
              Descartar
            </Button>
          )}
          <Button size="sm" onClick={handleSave} disabled={isSaving || !hasUnsaved} className="gap-1.5">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {isSaving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
