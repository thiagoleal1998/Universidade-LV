'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

type Parts = { year: number; month: number; day: number; hour: number; minute: number }

function parseLocalISO(v: string): Parts | null {
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return { year: +m[1], month: +m[2] - 1, day: +m[3], hour: +m[4], minute: +m[5] }
}

function toLocalISO(p: Parts): string {
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

function formatDisplay(p: Parts | null): string {
  if (!p) return ''
  return `${String(p.day).padStart(2, '0')}/${String(p.month + 1).padStart(2, '0')}/${p.year}  •  ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}

interface DateTimePickerProps {
  name?: string
  form?: string
  defaultValue?: string
  value?: string
  onChange?: (v: string) => void
  required?: boolean
  min?: string
  className?: string
  placeholder?: string
}

export function DateTimePicker({
  name,
  form,
  defaultValue,
  value,
  onChange,
  required,
  min,
  className,
  placeholder = 'Selecionar data e hora',
}: DateTimePickerProps) {
  const isControlled = value !== undefined

  const initial = parseLocalISO(isControlled ? (value ?? '') : (defaultValue ?? ''))
  const today = new Date()

  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(initial?.year ?? today.getFullYear())
  const [viewMonth, setViewMonth] = useState(initial?.month ?? today.getMonth())
  const [selected, setSelected] = useState<Parts | null>(initial)
  const [hour, setHour] = useState(initial?.hour ?? 9)
  const [minute, setMinute] = useState(initial?.minute ?? 0)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Sync when externally controlled value changes
  useEffect(() => {
    if (!isControlled) return
    const p = parseLocalISO(value ?? '')
    if (p) {
      setSelected(p)
      setHour(p.hour)
      setMinute(p.minute)
      setViewYear(p.year)
      setViewMonth(p.month)
    } else {
      setSelected(null)
    }
  }, [value, isControlled])

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const displayParts: Parts | null = selected ? { ...selected, hour, minute } : null
  const inputValue = displayParts ? toLocalISO(displayParts) : ''

  const minParts = min ? parseLocalISO(min) : null

  function isDayBlocked(day: number): boolean {
    if (!minParts) return false
    if (viewYear < minParts.year) return true
    if (viewYear > minParts.year) return false
    if (viewMonth < minParts.month) return true
    if (viewMonth > minParts.month) return false
    return day < minParts.day
  }

  function isToday(day: number) {
    return viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate()
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  function selectDay(day: number) {
    setSelected({ year: viewYear, month: viewMonth, day, hour, minute })
  }

  function confirm() {
    if (!selected) return
    const final = { ...selected, hour, minute }
    setSelected(final)
    const iso = toLocalISO(final)
    if (isControlled) onChange?.(iso)
    setOpen(false)
  }

  function handleHour(raw: string) {
    const v = Math.min(23, Math.max(0, parseInt(raw) || 0))
    setHour(v)
  }
  function handleMinute(raw: string) {
    const v = Math.min(59, Math.max(0, parseInt(raw) || 0))
    setMinute(v)
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className={cn('relative', className)}>
      {/* Hidden form input */}
      {name && (
        <input
          type="hidden"
          name={name}
          form={form}
          value={inputValue}
          required={required}
        />
      )}

      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'group flex items-center gap-2.5 w-full h-10 px-3.5 rounded-lg border text-sm transition-all',
          'bg-background border-input text-left',
          'hover:border-primary/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30',
          open && 'border-primary ring-2 ring-primary/20',
          !displayParts && 'text-muted-foreground',
        )}
      >
        <CalendarDays className={cn('w-4 h-4 shrink-0 transition-colors', open ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70')} />
        <span className="flex-1 truncate">
          {displayParts ? formatDisplay(displayParts) : placeholder}
        </span>
        {displayParts && (
          <span className="text-xs text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 shrink-0">
            {DAYS_PT[new Date(displayParts.year, displayParts.month, displayParts.day).getDay()]}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-2 bg-popover border border-border rounded-2xl shadow-xl overflow-hidden"
          style={{ minWidth: 296 }}
        >
          {/* Month navigation */}
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

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 px-4 pb-1">
            {DAYS_PT.map(d => (
              <div key={d} className="h-7 flex items-center justify-center text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 px-4 pb-3">
            {cells.map((day, i) => {
              if (!day) return <div key={i} />
              const blocked = isDayBlocked(day)
              const sel = selected?.year === viewYear && selected.month === viewMonth && selected.day === day
              const tod = isToday(day)
              return (
                <button
                  key={i}
                  type="button"
                  disabled={blocked}
                  onClick={() => selectDay(day)}
                  className={cn(
                    'h-8 w-8 mx-auto rounded-full text-sm transition-all flex items-center justify-center font-medium',
                    sel && 'bg-primary text-primary-foreground shadow-sm',
                    !sel && tod && 'text-primary ring-1 ring-primary/40',
                    !sel && !tod && !blocked && 'text-foreground hover:bg-muted',
                    blocked && 'opacity-25 cursor-not-allowed',
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {/* Time picker */}
          <div className="border-t border-border bg-muted/40 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                Horário
              </div>
              <div className="ml-auto flex items-center gap-1.5">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={String(hour).padStart(2, '0')}
                    onChange={e => handleHour(e.target.value)}
                    className="w-12 h-8 rounded-lg border border-input bg-background text-center text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <span className="text-lg font-bold text-muted-foreground leading-none">:</span>
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    step={5}
                    value={String(minute).padStart(2, '0')}
                    onChange={e => handleMinute(e.target.value)}
                    className="w-12 h-8 rounded-lg border border-input bg-background text-center text-sm font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <span className="text-xs text-muted-foreground ml-0.5">BRT</span>
              </div>
            </div>
          </div>

          {/* Confirm */}
          <div className="px-4 pb-4 pt-3">
            <button
              type="button"
              disabled={!selected}
              onClick={confirm}
              className={cn(
                'w-full h-9 rounded-xl text-sm font-semibold transition-all',
                selected
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {selected ? `Confirmar  ·  ${formatDisplay({ ...selected, hour, minute })}` : 'Selecione uma data'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
