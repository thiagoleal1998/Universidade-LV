'use client'

import { useState, useTransition, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toggleLessonComplete } from '@/app/actions/progress'
import { StudyVideoPlayer } from '@/components/members/study-video-player'
import { StudyCurriculum, type CurriculumModule } from '@/components/members/study-curriculum'
import { StudyNotes } from '@/components/members/study-notes'
import { LessonComments } from '@/components/members/lesson-comments'
import { LessonTaskForm } from '@/components/members/lesson-task-form'
import { ThemeToggle } from '@/components/theme-toggle'
import type { LessonTask, TaskResponse } from '@/app/actions/lesson-tasks'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, CheckCircle2, Circle,
  PanelRight, PanelRightClose, GraduationCap, X, Table2,
  Volume2, VolumeX, Play, Pause, StopCircle, Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim()
}

type TtsState = 'idle' | 'playing' | 'paused'

// Web Speech API não expõe duração real do áudio nem posição exata de
// reprodução — só o evento `boundary` (charIndex, suporte inconsistente
// entre navegadores). A barra de progresso abaixo é uma ESTIMATIVA: um
// timer avança a posição com base numa velocidade média de leitura
// (chars/segundo, ajustada pela velocidade escolhida), corrigida sempre
// que um evento `boundary` chega (nos navegadores que o disparam).
const CHARS_PER_SECOND_AT_1X = 15 // ~150-170 palavras/min, média de TTS
const SPEED_PRESETS = [0.75, 1, 1.25, 1.5, 2] as const

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.round(seconds)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function pickBestVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const checks: Array<(v: SpeechSynthesisVoice) => boolean> = [
    // Vozes neurais/naturais do Google (Chrome/Edge)
    (v) => v.name === 'Google português do Brasil',
    (v) => v.name.toLowerCase().includes('google') && v.lang.startsWith('pt'),
    // Voz natural da Apple (Safari/macOS)
    (v) => v.name === 'Luciana' && v.lang.startsWith('pt'),
    (v) => v.name.toLowerCase().includes('luciana'),
    // Qualquer voz pt-BR
    (v) => v.lang === 'pt-BR',
    (v) => v.lang.startsWith('pt'),
  ]
  for (const check of checks) {
    const match = voices.find(check)
    if (match) return match
  }
  return null
}

function TextToSpeechPlayer({ html }: { html: string }) {
  const text = useMemo(() => stripHtml(html), [html])
  const totalChars = text.length

  const [ttsState, setTtsState] = useState<TtsState>('idle')
  const [rate, setRate] = useState<number>(1)
  const [volume, setVolume] = useState(1)
  const [prevVolume, setPrevVolume] = useState(1)
  const [playedChars, setPlayedChars] = useState(0)
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)

  // Posição absoluta (em `text`) onde a fala ATUAL começou, e referência de
  // tempo/posição pro timer estimar o avanço a partir dali.
  const startCharRef = useRef(0)
  const playStartTimeRef = useRef(0)
  const playStartCharRef = useRef(0)
  const hasLiveUtteranceRef = useRef(false)
  const generationRef = useRef(0)

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel() }
  }, [html])

  // Timer que estima o avanço da leitura enquanto toca — é o que faz a
  // barra se mover em navegadores que não disparam o evento `boundary`.
  useEffect(() => {
    if (ttsState !== 'playing') return
    const id = setInterval(() => {
      const elapsedSec = (performance.now() - playStartTimeRef.current) / 1000
      const estimate = playStartCharRef.current + elapsedSec * CHARS_PER_SECOND_AT_1X * rate
      setPlayedChars(Math.min(estimate, totalChars))
    }, 200)
    return () => clearInterval(id)
  }, [ttsState, rate, totalChars])

  function buildUtterance(fromChar: number, atRate: number, atVolume: number) {
    const gen = ++generationRef.current
    const utterance = new SpeechSynthesisUtterance(text.slice(fromChar))
    utterance.lang = 'pt-BR'
    utterance.rate = atRate
    utterance.pitch = 1
    utterance.volume = atVolume
    const voice = pickBestVoice()
    if (voice) utterance.voice = voice
    utterance.onboundary = (e) => {
      if (gen !== generationRef.current) return
      const abs = fromChar + e.charIndex
      playStartCharRef.current = abs
      playStartTimeRef.current = performance.now()
      setPlayedChars(abs)
    }
    utterance.onend = () => {
      if (gen !== generationRef.current) return
      hasLiveUtteranceRef.current = false
      setTtsState('idle')
      setPlayedChars(0)
    }
    utterance.onerror = () => {
      if (gen !== generationRef.current) return
      hasLiveUtteranceRef.current = false
      setTtsState('idle')
    }
    return utterance
  }

  function playFrom(fromChar: number) {
    window.speechSynthesis.cancel()
    const clamped = Math.max(0, Math.min(fromChar, totalChars - 1))
    startCharRef.current = clamped
    playStartCharRef.current = clamped
    playStartTimeRef.current = performance.now()
    hasLiveUtteranceRef.current = true
    setPlayedChars(clamped)
    window.speechSynthesis.speak(buildUtterance(clamped, rate, volume))
    setTtsState('playing')
  }

  function handlePlay() {
    if (ttsState === 'paused' && hasLiveUtteranceRef.current) {
      window.speechSynthesis.resume()
      playStartCharRef.current = playedChars
      playStartTimeRef.current = performance.now()
      setTtsState('playing')
      return
    }
    playFrom(playedChars >= totalChars - 1 ? 0 : playedChars)
  }

  function handlePause() {
    window.speechSynthesis.pause()
    setTtsState('paused')
  }

  function handleStop() {
    window.speechSynthesis.cancel()
    hasLiveUtteranceRef.current = false
    generationRef.current++
    setTtsState('idle')
    setPlayedChars(0)
  }

  function handleSeek(fraction: number) {
    const target = Math.round(fraction * totalChars)
    if (ttsState === 'playing') {
      playFrom(target)
    } else {
      window.speechSynthesis.cancel()
      hasLiveUtteranceRef.current = false
      generationRef.current++
      setPlayedChars(target)
    }
  }

  // Rate/volume não são alteráveis de forma confiável numa fala já em
  // andamento entre navegadores — a correção é recriar a utterance a
  // partir da posição atual, preservando play/pause.
  function applyRate(next: number) {
    setRate(next)
    setSpeedMenuOpen(false)
    if (ttsState === 'idle') return
    const wasPlaying = ttsState === 'playing'
    window.speechSynthesis.cancel()
    const clamped = Math.max(0, Math.min(Math.round(playedChars), totalChars - 1))
    startCharRef.current = clamped
    playStartCharRef.current = clamped
    playStartTimeRef.current = performance.now()
    hasLiveUtteranceRef.current = true
    window.speechSynthesis.speak(buildUtterance(clamped, next, volume))
    if (!wasPlaying) window.speechSynthesis.pause()
    setTtsState(wasPlaying ? 'playing' : 'paused')
  }

  function applyVolume(next: number) {
    setVolume(next)
    if (ttsState === 'idle') return
    const wasPlaying = ttsState === 'playing'
    window.speechSynthesis.cancel()
    const clamped = Math.max(0, Math.min(Math.round(playedChars), totalChars - 1))
    startCharRef.current = clamped
    playStartCharRef.current = clamped
    playStartTimeRef.current = performance.now()
    hasLiveUtteranceRef.current = true
    window.speechSynthesis.speak(buildUtterance(clamped, rate, next))
    if (!wasPlaying) window.speechSynthesis.pause()
    setTtsState(wasPlaying ? 'playing' : 'paused')
  }

  function toggleMute() {
    if (volume > 0) {
      setPrevVolume(volume)
      applyVolume(0)
    } else {
      applyVolume(prevVolume > 0 ? prevVolume : 1)
    }
  }

  if (!text) return null

  const duration = totalChars / (CHARS_PER_SECOND_AT_1X * rate)
  const current = Math.min(playedChars, totalChars) / (CHARS_PER_SECOND_AT_1X * rate)
  const fraction = totalChars > 0 ? Math.min(playedChars / totalChars, 1) : 0
  const iconBtn = 'w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-muted text-muted-foreground hover:text-foreground shrink-0'

  return (
    <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <Volume2 className={cn('w-4 h-4 shrink-0', ttsState === 'playing' ? 'text-primary' : 'text-muted-foreground')} />
        <span className="text-sm text-muted-foreground">Ouvir esta aula</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {ttsState === 'playing' ? (
          <button onClick={handlePause} title="Pausar" className={iconBtn}>
            <Pause className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button onClick={handlePlay} title={ttsState === 'paused' ? 'Continuar' : 'Reproduzir'} className={iconBtn}>
            <Play className="w-4 h-4 fill-current" />
          </button>
        )}
        <button onClick={handleStop} title="Parar" className={iconBtn}>
          <StopCircle className="w-4 h-4" />
        </button>

        <span className="text-xs tabular-nums text-muted-foreground w-9 text-right shrink-0">{formatTime(current)}</span>
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(fraction * 1000)}
          onChange={(e) => handleSeek(Number(e.target.value) / 1000)}
          className="flex-1 h-1.5 accent-primary cursor-pointer"
          aria-label="Posição da leitura"
        />
        <span className="text-xs tabular-nums text-muted-foreground w-9 shrink-0">{formatTime(duration)}</span>

        {/* Velocidade */}
        <div className="relative shrink-0">
          <button
            onClick={() => setSpeedMenuOpen((o) => !o)}
            title="Velocidade de leitura"
            className="h-8 px-2 rounded-full flex items-center gap-1 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            <Gauge className="w-3.5 h-3.5" />
            {rate}×
          </button>
          {speedMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setSpeedMenuOpen(false)} />
              <div className="absolute bottom-full right-0 mb-1 z-20 bg-popover border border-border rounded-lg shadow-md py-1 min-w-[4.5rem]">
                {SPEED_PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => applyRate(p)}
                    className={cn(
                      'w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors',
                      p === rate && 'text-primary font-medium'
                    )}
                  >
                    {p}×
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Volume */}
        <div className="hidden sm:flex items-center gap-1 shrink-0">
          <button onClick={toggleMute} title={volume > 0 ? 'Mudo' : 'Ativar som'} className={iconBtn}>
            {volume > 0 ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => applyVolume(Number(e.target.value) / 100)}
            className="w-16 h-1.5 accent-primary cursor-pointer"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  )
}

function getSheetEmbedUrl(url: string): string | null {
  if (!url?.trim()) return null
  const gsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (gsMatch) {
    const id = gsMatch[1]
    const gidMatch = url.match(/[?&]gid=(\d+)/)
    const gid = gidMatch ? `?gid=${gidMatch[1]}` : ''
    return `https://docs.google.com/spreadsheets/d/${id}/htmlview${gid}`
  }
  if (url.includes('sharepoint.com') || url.includes('office.com') || url.includes('onedrive.live.com')) {
    return url.includes('action=embedview') ? url : `${url}&action=embedview`
  }
  return null
}

type Comment = {
  id: string
  body: string
  created_at: string
  user_id: string
  parent_id: string | null
  is_pinned: boolean
  is_hidden: boolean
  profiles: { full_name: string } | null
}

type Photo = { id: string; url: string; caption: string }
type Attachment = { id: string; name: string; url: string; size_bytes: number; mime_type: string }

type Props = {
  lessonId: string
  lessonTitle: string
  lessonDescription: string | null
  contentText: string | null
  embedUrl: string | null
  videoId: string | null
  photos: Photo[]
  attachments: Attachment[]
  isCompleted: boolean
  isAdmin: boolean
  canModerate?: boolean
  isDraft: boolean
  note: string
  noteDraft?: string
  courseId: string
  courseName: string
  logoUrl: string
  siteName: string
  curriculum: CurriculumModule[]
  prevLessonId: string | null
  nextLessonId: string | null
  nextLessonTitle: string | null
  comments: Comment[]
  currentUserId: string
  totalDone: number
  totalLessons: number
  task?: LessonTask | null
  myTaskResponse?: TaskResponse | null
  sheetUrl?: string | null
  taskStartDate?: string | null
  taskEndDate?: string | null
  initialTab?: Tab
}

type Tab = 'sobre' | 'comentarios' | 'anotacoes'

export function StudyInterface({
  lessonId,
  lessonTitle,
  lessonDescription,
  contentText,
  embedUrl,
  videoId,
  photos,
  attachments,
  isCompleted: initialCompleted,
  isAdmin,
  canModerate = false,
  isDraft,
  note,
  noteDraft = '',
  courseId,
  courseName,
  logoUrl,
  siteName,
  curriculum,
  prevLessonId,
  nextLessonId,
  nextLessonTitle,
  comments,
  currentUserId,
  totalDone,
  totalLessons,
  task = null,
  myTaskResponse = null,
  sheetUrl = null,
  taskStartDate = null,
  taskEndDate = null,
  initialTab = 'sobre',
}: Props) {
  const router = useRouter()
  const [completed, setCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<Tab>(initialTab)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showNextBanner, setShowNextBanner] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const pct = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0

  // Reset só ao TROCAR de aula. Não pode depender de initialCompleted: o
  // revalidatePath de toggleLessonComplete devolve esse valor atualizado
  // segundos depois do clique, e o reset matava o banner no meio da contagem
  // — o aluno via "Ir agora (3s)" sumir e nunca era levado adiante.
  const prevLessonRef = useRef(lessonId)
  useEffect(() => {
    if (prevLessonRef.current === lessonId) return
    prevLessonRef.current = lessonId
    setCompleted(initialCompleted)
    setShowNextBanner(false)
  }, [lessonId, initialCompleted])

  function startCountdown() {
    if (!nextLessonId) return
    setCountdown(5)
    setShowNextBanner(true)
    // Busca a próxima aula durante a contagem. Sem isso, o commit da rota só
    // começa quando a contagem zera e a tela fica ~3s parada em "Ir agora (0s)",
    // parecendo travada.
    router.prefetch(`/dashboard/aulas/${nextLessonId}`)
  }

  // A contagem vive num efeito que reage ao state, e não dentro do updater do
  // setCountdown: navegar de dentro de um updater é efeito colateral em fase
  // de atualização, e o React descarta — o banner contava até zero e o aluno
  // ficava parado na mesma aula.
  useEffect(() => {
    if (!showNextBanner || !nextLessonId) return
    if (countdown <= 0) {
      router.push(`/dashboard/aulas/${nextLessonId}`)
      return
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [showNextBanner, countdown, nextLessonId, router])

  function dismissBanner() {
    setShowNextBanner(false)
  }

  function handleToggle() {
    startTransition(async () => {
      const next = !completed
      const result = await toggleLessonComplete(lessonId, next)
      if (result?.error) {
        toast.error(result.error)
      } else {
        setCompleted(next)
        if (next) {
          toast.success('Aula concluída!')
          if (nextLessonId) startCountdown()
        } else {
          toast.success('Marcação removida.')
        }
      }
    })
  }

  return (
    <div className="flex flex-col h-screen">
      {/* ── Header ── */}
      <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/dashboard/cursos/${courseId}`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Cursos</span>
          </Link>

          <div className="hidden sm:block w-px h-4 bg-border" />

          {logoUrl ? (
            <Image src={logoUrl} alt={siteName} width={20} height={20} className="object-contain shrink-0" />
          ) : (
            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
          )}

          <span className="text-sm font-medium text-foreground truncate hidden md:block">{courseName}</span>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{totalDone}/{totalLessons}</span>
          </div>

          {isDraft && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300 text-xs">Rascunho</Badge>
          )}

          <ThemeToggle className="w-8 h-8" />

          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title={sidebarOpen ? 'Fechar currículo' : 'Abrir currículo'}
          >
            {sidebarOpen
              ? <PanelRightClose className="w-4 h-4" />
              : <PanelRight className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Video */}
          {videoId ? (
            <StudyVideoPlayer videoId={videoId} />
          ) : embedUrl ? (
            <div className="w-full aspect-video bg-black">
              <iframe
                src={embedUrl}
                title={lessonTitle}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : null}

          {/* Tabs */}
          <div className="border-b border-border px-6 flex gap-1 shrink-0">
            {([
              { id: 'sobre',       label: 'Sobre' },
              { id: 'comentarios', label: 'Comentários' },
              { id: 'anotacoes',   label: 'Anotações' },
            ] as { id: Tab; label: string }[]).map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px',
                  tab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 px-6 py-6 space-y-6">
            {tab === 'sobre' && (
              <>
                <div>
                  <h1 className="text-xl font-bold text-green-600">{lessonTitle}</h1>
                  {lessonDescription && (
                    <p className="text-muted-foreground mt-1 text-sm">{lessonDescription}</p>
                  )}
                </div>

                {contentText && (
                  <>
                    {!videoId && !embedUrl && !task && (
                      <TextToSpeechPlayer html={contentText} />
                    )}
                    <div
                      className="rich-text"
                      dangerouslySetInnerHTML={{ __html: contentText }}
                    />
                  </>
                )}

                {photos.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-4">Galeria de Fotos</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {photos.map((photo) => (
                        <figure key={photo.id} className="rounded-lg overflow-hidden border">
                          <Image
                            src={photo.url}
                            alt={photo.caption || 'Foto da aula'}
                            width={600}
                            height={400}
                            className="w-full object-cover"
                          />
                          {photo.caption && (
                            <figcaption className="text-xs text-muted-foreground px-3 py-2">{photo.caption}</figcaption>
                          )}
                        </figure>
                      ))}
                    </div>
                  </div>
                )}

                {attachments.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Materiais de Apoio</h3>
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.url}
                          download={att.name}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors"
                        >
                          <span className="text-sm font-medium text-foreground flex-1 truncate">{att.name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {sheetUrl && getSheetEmbedUrl(sheetUrl) && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-green-600" />
                      Planilha
                    </h3>
                    <div className="rounded-xl overflow-hidden border border-border w-full" style={{ height: 420 }}>
                      <iframe
                        src={getSheetEmbedUrl(sheetUrl)!}
                        title="Planilha da aula"
                        className="w-full h-full"
                      />
                    </div>
                  </div>
                )}

                {task && (
                  <LessonTaskForm
                    task={task}
                    lessonId={lessonId}
                    initialResponse={myTaskResponse}
                    isAdminPreview={isAdmin}
                    taskStartDate={taskStartDate}
                    taskEndDate={taskEndDate}
                  />
                )}
              </>
            )}

            {tab === 'comentarios' && (
              <LessonComments
                lessonId={lessonId}
                comments={comments}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                canModerate={canModerate}
              />
            )}

            {tab === 'anotacoes' && (
              <StudyNotes lessonId={lessonId} initialContent={note} initialDraft={noteDraft} />
            )}
          </div>

          {/* Bottom nav */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between gap-4 shrink-0">
            {prevLessonId ? (
              <Link
                href={`/dashboard/aulas/${prevLessonId}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
              >
                <ArrowLeft className="w-4 h-4" />
                Anterior
              </Link>
            ) : <div />}

            <Button
              variant={completed ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggle}
              disabled={isPending}
              className="gap-2"
            >
              {completed
                ? <><CheckCircle2 className="w-4 h-4" /> Concluída</>
                : <><Circle className="w-4 h-4" /> Marcar como concluída</>}
            </Button>

            {nextLessonId ? (
              <Link
                href={`/dashboard/aulas/${nextLessonId}`}
                className={cn(buttonVariants({ size: 'sm' }), 'gap-1')}
              >
                Próxima
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : <div />}
          </div>
        </div>

        {/* Curriculum sidebar */}
        <StudyCurriculum
          modules={curriculum}
          currentLessonId={lessonId}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
      </div>

      {/* ── Next lesson banner ── */}
      {showNextBanner && nextLessonId && nextLessonTitle && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-xl px-5 py-3 flex items-center gap-4 max-w-md w-full">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Aula concluída!</p>
            <p className="text-xs text-muted-foreground truncate">Próxima: {nextLessonTitle}</p>
          </div>
          <Button
            size="sm"
            onClick={() => router.push(`/dashboard/aulas/${nextLessonId}`)}
            disabled={countdown <= 0}
          >
            {countdown > 0 ? `Ir agora (${countdown}s)` : 'Abrindo...'}
          </Button>
          <button
            onClick={dismissBanner}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}
