'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const MONTHS_ABBR_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Parts = { year: number; month: number; day: number }

// O valor é salvo como texto livre exibido direto pro aluno (sem parsing em
// lugar nenhum, ver podviajar/page.tsx) — por isso o formato de saída é
// "27 Jun 2026" (dia + mês abreviado + ano), não ISO. Campos antigos
// digitados à mão em outro formato não quebram: só não pré-selecionam nada
// no calendário até o admin escolher uma data nova.
function parseDisplay(v: string): Parts | null {
  const m = v.trim().match(/^(\d{1,2})\s+([A-Za-zçÇ]{3})\.?\s+(\d{4})$/)
  if (!m) return null
  const abbr = m[2].slice(0, 3).toLowerCase()
  const month = MONTHS_ABBR_PT.findIndex((a) => a.toLowerCase() === abbr)
  if (month === -1) return null
  return { year: parseInt(m[3], 10), month, day: parseInt(m[1], 10) }
}

function formatDisplay(p: Parts): string {
  return `${p.day} ${MONTHS_ABBR_PT[p.month]} ${p.year}`
}

export function SimpleDatePicker({
  value,
  onChange,
  placeholder = 'Selecionar data',
  className,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const today = new Date()
  const parsed = parseDisplay(value)

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(parsed?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth())
  const popoverRef = useRef<HTMLDivElement>(null)

  // Sincroniza o mês/ano exibido quando o valor muda por fora (ex.: trocar
  // de episódio na lista) — sem isso o calendário abriria sempre no mês
  // atual, ignorando a data já salva.
  useEffect(() => {
    const p = parseDisplay(value)
    if (p) { setViewYear(p.year); setViewMonth(p.month) }
  }, [value])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    onChange(formatDisplay({ year: viewYear, month: viewMonth, day }))
    setOpen(false)
  }

  function isToday(day: number) {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'group flex items-center gap-2.5 w-full h-9 px-3 rounded-lg border text-sm transition-all',
          'bg-background border-input text-left',
          'hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          open && 'border-primary ring-2 ring-primary/20',
          !value && 'text-muted-foreground',
        )}
      >
        <CalendarDays className={cn('w-4 h-4 shrink-0 transition-colors', open ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70')} />
        <span className="flex-1 truncate">{value || placeholder}</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden"
          style={{ minWidth: 280 }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTHS_PT[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 px-4 pb-1">
            {DAYS_PT.map((d) => (
              <div key={d} className="h-7 flex items-center justify-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 px-4 pb-4">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const sel = parsed?.year === viewYear && parsed.month === viewMonth && parsed.day === day
              const tod = isToday(day)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full text-sm transition-all flex items-center justify-center font-medium',
                    sel && 'bg-primary text-primary-foreground shadow-sm',
                    !sel && tod && 'text-primary ring-1 ring-primary/40',
                    !sel && !tod && 'text-foreground hover:bg-muted',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
