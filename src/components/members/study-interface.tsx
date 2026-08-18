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
  Maximize2, Minimize2, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Sugestão real do Cesar (CLV-0050): links não precisam de áudio — o caso
// comum é uma URL colada direto no texto (o `autolink` do RichTextEditor
// já vira `<a>`, com o texto visível sendo a própria URL crua), e o TTS
// tentava "pronunciar" isso letra por letra/barra por barra, o que soa
// péssimo e não ajuda quem está ouvindo. Remove o link inteiro (tag +
// conteúdo), não só a tag — sem isso, o texto de dentro do `<a>` (a URL, ou
// um rótulo tipo "clique aqui") continuaria sendo lido normalmente.
function stripHtml(html: string) {
  return html
    .replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
const OBSERVED_RATE_MIN = 5
const OBSERVED_RATE_MAX = 30

// Velocidade real aprendida, persistida entre aulas/sessões — bug real
// reaberto pelo Cesar (CLV-0047, "o erro ainda persiste") depois da correção
// via evento `boundary`: esse evento tem suporte inconsistente entre
// navegadores e, em muitos Android/Chrome mobile (o aparelho usado nos
// prints do Cesar), simplesmente NUNCA dispara — nesse caso a correção
// anterior nunca tinha dado nenhum sinal pra corrigir, e o bug original
// (duração fixa errada a leitura inteira) continuava intacto. `onend`, ao
// contrário do `boundary`, é garantido pela spec e sempre dispara quando a
// fala termina — então ele serve de calibração terminal: mede a duração
// REAL da narração completa e grava no localStorage, pra toda narração
// SEGUINTE (mesma aula ou outra, mesmo depois de recarregar a página) já
// começar com uma estimativa correta desde o primeiro segundo, sem
// depender do `boundary` funcionar.
const OBSERVED_RATE_STORAGE_KEY = 'tts_observed_chars_per_sec'

function readLearnedRate(): number {
  try {
    const raw = localStorage.getItem(OBSERVED_RATE_STORAGE_KEY)
    const n = raw ? Number(raw) : NaN
    if (Number.isFinite(n) && n >= OBSERVED_RATE_MIN && n <= OBSERVED_RATE_MAX) return n
  } catch {}
  return CHARS_PER_SECOND_AT_1X
}

function saveLearnedRate(rate: number) {
  try { localStorage.setItem(OBSERVED_RATE_STORAGE_KEY, String(rate)) } catch {}
}

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

  // Debounce de seek/volume (CLV-0048, ver `handleSeek`/`applyVolume` abaixo)
  // + flag que impede o timer de extrapolação de sobrescrever a posição
  // enquanto um seek está "em voo" aguardando o debounce.
  const seekDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const volumeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSeekingRef = useRef(false)
  // Verdadeiro enquanto o ponteiro (mouse/dedo) está fisicamente pressionado
  // sobre o slider — enquanto isso, o debounce por TEMPO fica suspenso (só
  // serve de reserva pra teclado); a confirmação de verdade espera o
  // `onPointerUp`. Sem isso, um arraste real com uma pausa >200ms no meio
  // (comum — dedo humano não é perfeitamente contínuo) ainda disparava uma
  // recriação prematura mesmo com o dedo na tela (CLV-0048 reaberto).
  const seekPointerDownRef = useRef(false)
  const volumePointerDownRef = useRef(false)

  // Velocidade de leitura OBSERVADA (chars/seg a 1x), corrigida em tempo real
  // a partir do próprio evento `boundary` — bug real corrigido (CLV-0047,
  // relatado pelo Cesar): a duração total mostrada usava só a constante fixa
  // acima, então ficava errada o tempo todo (ex. "0:38" pra uma narração
  // real de 46s, quando a voz do navegador lê mais devagar que a média
  // assumida). Como o evento já entrega char lido + tempo decorrido de
  // verdade, dá pra recalcular a velocidade real e convergir a duração
  // mostrada pro valor certo conforme a fala avança, em vez de usar um
  // número fixo a leitura inteira. Começa na constante (melhor estimativa
  // possível antes do primeiro boundary) e só é ajustada com dado
  // suficiente (guard de tempo/chars abaixo) pra não oscilar com ruído dos
  // primeiros eventos.
  // ESTADO, não ref — bug real encontrado testando: uma ref atualizada dentro
  // de um efeito não dispara re-render sozinha, então a duração exibida
  // (calculada no corpo do render) ficava presa no valor antigo até algum
  // OUTRO estado mudar por acaso (ex.: só depois de dar play). Com estado,
  // ler a velocidade aprendida na montagem já atualiza a duração exibida
  // imediatamente, mesmo antes do primeiro play. Inicializa com a constante
  // (SSR-safe — `localStorage` só existe no client); o efeito abaixo troca
  // pela velocidade aprendida assim que monta.
  const [observedCharsPerSec, setObservedCharsPerSec] = useState(CHARS_PER_SECOND_AT_1X)

  useEffect(() => {
    setObservedCharsPerSec(readLearnedRate())
  }, [html])

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current)
      if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current)
    }
  }, [html])

  // Timer que estima o avanço da leitura enquanto toca — é o que faz a
  // barra se mover em navegadores que não disparam o evento `boundary`.
  useEffect(() => {
    if (ttsState !== 'playing') return
    const id = setInterval(() => {
      // Não pisa na posição enquanto um seek está em voo (aguardando o
      // debounce) — senão a barra arrastada "volta sozinha" por um instante.
      if (isSeekingRef.current) return
      const elapsedSec = (performance.now() - playStartTimeRef.current) / 1000
      const estimate = playStartCharRef.current + elapsedSec * observedCharsPerSec * rate
      setPlayedChars(Math.min(estimate, totalChars))
    }, 200)
    return () => clearInterval(id)
  }, [ttsState, rate, totalChars, observedCharsPerSec])

  function buildUtterance(fromChar: number, atRate: number, atVolume: number) {
    const gen = ++generationRef.current
    const utterance = new SpeechSynthesisUtterance(text.slice(fromChar))
    utterance.lang = 'pt-BR'
    utterance.rate = atRate
    utterance.pitch = 1
    utterance.volume = atVolume
    const voice = pickBestVoice()
    if (voice) utterance.voice = voice
    const utteranceStartTime = performance.now()
    utterance.onboundary = (e) => {
      if (gen !== generationRef.current) return
      // Enquanto um seek está em voo (arrastando a barra, aguardando o
      // soltar), a utterance ANTIGA continua falando por baixo até o
      // release — e seu onboundary continuava chamando setPlayedChars()
      // com a posição REAL (antiga), brigando com o setPlayedChars(target)
      // do próprio arraste. Resultado: a barra ficava "voltando sozinha"
      // repetidas vezes durante o drag, dando a impressão de trecho
      // perdido/áudio confuso (chamado CLV-0048, relatado de novo pelo
      // Cesar). O timer de extrapolação já tinha esse mesmo guard
      // (isSeekingRef) — faltava aplicar aqui também.
      if (isSeekingRef.current) return
      const abs = fromChar + e.charIndex
      playStartCharRef.current = abs
      playStartTimeRef.current = performance.now()
      setPlayedChars(abs)

      const elapsedSec = (performance.now() - utteranceStartTime) / 1000
      if (elapsedSec > 1 && e.charIndex > 30) {
        const observed = (e.charIndex / elapsedSec) / atRate
        // Clamp: protege contra evento isolado com timing esquisito (troca de
        // aba, engine pausando/retomando) puxando a estimativa pra um
        // extremo absurdo.
        setObservedCharsPerSec(Math.max(OBSERVED_RATE_MIN, Math.min(OBSERVED_RATE_MAX, observed)))
      }
    }
    utterance.onend = () => {
      if (gen !== generationRef.current) return
      hasLiveUtteranceRef.current = false
      setTtsState('idle')
      setPlayedChars(0)

      // Calibração terminal — roda mesmo em navegadores onde `onboundary`
      // nunca disparou (ex.: vários Android/Chrome mobile, confirmado real
      // pelo Cesar reabrindo o chamado depois da 1ª correção baseada só em
      // `boundary`). Mede a duração de VERDADE da narração completa que
      // acabou de tocar e grava, pra próxima narração (mesma aula ou
      // qualquer outra, mesmo depois de recarregar a página) já começar
      // certa desde o primeiro segundo.
      const utteranceChars = text.length - fromChar
      const totalElapsedSec = (performance.now() - utteranceStartTime) / 1000
      if (utteranceChars > 50 && totalElapsedSec > 2) {
        const observed = (utteranceChars / totalElapsedSec) / atRate
        const clamped = Math.max(OBSERVED_RATE_MIN, Math.min(OBSERVED_RATE_MAX, observed))
        setObservedCharsPerSec(clamped)
        saveLearnedRate(clamped)
      }
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
    const utterance = buildUtterance(clamped, rate, volume)
    // `speak()` chamado no MESMO tick de `cancel()` é um bug conhecido do
    // motor do Chrome — a fala nova às vezes é silenciosamente descartada
    // ou demora bem mais que o esperado pra começar, em vez do gap curto
    // esperado de uma recriação normal. Um `setTimeout(0)` empurra o
    // `speak()` pro próximo tick, depois do `cancel()` já ter sido
    // processado de verdade pelo motor — mitigação padrão documentada
    // pra esse bug.
    setTimeout(() => window.speechSynthesis.speak(utterance), 0)
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
    // Um seek/volume debounced ainda pendente reviveria a fala depois do
    // Stop (closure antiga com `ttsState === 'playing'`) se não for cancelado.
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current)
    if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current)
    isSeekingRef.current = false
    setTtsState('idle')
    setPlayedChars(0)
  }

  // `<input type="range">` dispara `onChange` continuamente durante o
  // arraste (não só no soltar) — bug real corrigido (CLV-0048, relatado
  // pelo Cesar): tanto o seek quanto o volume cancelavam e recriavam a
  // `SpeechSynthesisUtterance` inteira a CADA disparo, e arrastar gera
  // dezenas deles por segundo. O resultado ("o áudio diminui a velocidade
  // consideravelmente e não é possível ouvir a narração") é a fala sendo
  // reiniciada em loop antes de qualquer trecho terminar de tocar.
  //
  // Segunda rodada (CLV-0048 reaberto): o debounce de 200ms sozinho ainda
  // "engasgava" — um arraste de dedo de verdade tem micro-pausas naturais, e
  // se algum intervalo entre eventos passar de 200ms com o dedo AINDA na
  // tela, o debounce disparava no meio do arraste mesmo assim, cortando o
  // áudio e "atrasando" a barra (cada disparo prematuro reseta a âncora de
  // posição). Corrigido confirmando a mudança de verdade no SOLTAR
  // (`onPointerUp`), não só por tempo — o debounce continua existindo como
  // rede de segurança pra teclado (setas no input focado não disparam
  // pointerup), mas na prática nunca dispara durante um arraste de
  // mouse/toque de verdade, só quando o usuário solta.
  const lastSeekTargetRef = useRef(0)

  function commitSeek(target: number) {
    if (seekDebounceRef.current) { clearTimeout(seekDebounceRef.current); seekDebounceRef.current = null }
    isSeekingRef.current = false
    if (ttsState === 'playing') {
      playFrom(target)
    } else {
      window.speechSynthesis.cancel()
      hasLiveUtteranceRef.current = false
      generationRef.current++
      setPlayedChars(target)
    }
  }

  function handleSeek(fraction: number) {
    const target = Math.round(fraction * totalChars)
    lastSeekTargetRef.current = target
    isSeekingRef.current = true
    setPlayedChars(target) // feedback visual imediato; o motor de voz só é tocado no soltar (ou no debounce, de reserva)
    if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current)
    // Com o ponteiro pressionado, quem confirma é o `onPointerUp` — o timer
    // fica de fora, senão uma pausa >200ms no meio do arraste (dedo ainda na
    // tela) dispararia a mesma recriação prematura que este bug já teve.
    if (!seekPointerDownRef.current) {
      seekDebounceRef.current = setTimeout(() => commitSeek(target), 200)
    }
  }

  // Rate/volume não são alteráveis de forma confiável numa fala já em
  // andamento entre navegadores — a correção é recriar a utterance a
  // partir da posição atual, preservando play/pause. Velocidade é só um
  // clique num preset (sem drag), então não precisa do mesmo debounce.
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
    const utterance = buildUtterance(clamped, next, volume)
    // Ver comentário em playFrom — mesmo bug do Chrome (speak() colado no
    // cancel() no mesmo tick).
    setTimeout(() => {
      window.speechSynthesis.speak(utterance)
      if (!wasPlaying) window.speechSynthesis.pause()
    }, 0)
    setTtsState(wasPlaying ? 'playing' : 'paused')
  }

  function commitVolume(next: number) {
    if (volumeDebounceRef.current) { clearTimeout(volumeDebounceRef.current); volumeDebounceRef.current = null }
    if (ttsState === 'idle') return
    const wasPlaying = ttsState === 'playing'
    window.speechSynthesis.cancel()
    const clamped = Math.max(0, Math.min(Math.round(playedChars), totalChars - 1))
    startCharRef.current = clamped
    playStartCharRef.current = clamped
    playStartTimeRef.current = performance.now()
    hasLiveUtteranceRef.current = true
    const utterance = buildUtterance(clamped, rate, next)
    // Ver comentário em playFrom — mesmo bug do Chrome (speak() colado no
    // cancel() no mesmo tick). Era a suspeita mais provável pro chamado
    // CLV-0048 reaberto de novo ("fica mudo por um pequeno tempo ao soltar
    // o volume") — cancel()+speak() síncronos no mesmo tick fazem o motor
    // ora descartar a fala nova, ora demorar bem mais que o esperado pra
    // retomar; adiar o speak() um tick evita as duas coisas.
    setTimeout(() => {
      window.speechSynthesis.speak(utterance)
      if (!wasPlaying) window.speechSynthesis.pause()
    }, 0)
    setTtsState(wasPlaying ? 'playing' : 'paused')
  }

  function applyVolume(next: number) {
    setVolume(next) // feedback visual imediato (posição do slider, ícone de mudo)
    if (volumeDebounceRef.current) clearTimeout(volumeDebounceRef.current)
    // Mesmo raciocínio do seek: com o ponteiro pressionado, quem confirma é
    // o `onPointerUp` — o timer só entra em jogo pra mudança via teclado.
    if (!volumePointerDownRef.current) {
      volumeDebounceRef.current = setTimeout(() => commitVolume(next), 200)
    }
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

  const duration = totalChars / (observedCharsPerSec * rate)
  const current = Math.min(playedChars, totalChars) / (observedCharsPerSec * rate)
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
          onPointerDown={() => { seekPointerDownRef.current = true }}
          onPointerUp={() => { seekPointerDownRef.current = false; commitSeek(lastSeekTargetRef.current) }}
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
            onPointerDown={() => { volumePointerDownRef.current = true }}
            onPointerUp={(e) => { volumePointerDownRef.current = false; commitVolume(Number(e.currentTarget.value) / 100) }}
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

// Chamado CLV-0045: link de download da planilha, ao lado do embed. Google
// Sheets tem endpoint de export direto; SharePoint/OneDrive não tem um
// padrão público equivalente sem autenticação da API deles, então cai no
// link original (a pessoa baixa por lá, com a UI nativa do provedor).
function getSheetDownloadUrl(url: string): string | null {
  if (!url?.trim()) return null
  const gsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (gsMatch) return `https://docs.google.com/spreadsheets/d/${gsMatch[1]}/export?format=xlsx`
  if (url.includes('sharepoint.com') || url.includes('office.com') || url.includes('onedrive.live.com')) return url
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
  // Chamado CLV-0045: caixa da planilha embutida começa compacta (420px) e
  // pode "esticar" pra ver mais linhas/colunas de uma vez sem rolar tanto.
  const [sheetExpanded, setSheetExpanded] = useState(false)

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
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Table2 className="w-4 h-4 text-green-600" />
                        Planilha
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {getSheetDownloadUrl(sheetUrl) && (
                          <a
                            href={getSheetDownloadUrl(sheetUrl)!}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
                            title="Baixar planilha"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Baixar</span>
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setSheetExpanded((v) => !v)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
                          title={sheetExpanded ? 'Recolher' : 'Expandir'}
                        >
                          {sheetExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">{sheetExpanded ? 'Recolher' : 'Expandir'}</span>
                        </button>
                      </div>
                    </div>
                    <div
                      className="rounded-xl overflow-hidden border border-border w-full transition-[height] duration-200"
                      style={{ height: sheetExpanded ? '80vh' : 420 }}
                    >
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
          courseId={courseId}
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
