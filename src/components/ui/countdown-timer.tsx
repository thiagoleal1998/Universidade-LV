'use client'

import { useEffect, useState } from 'react'

type TimeLeft = { days: number; hours: number; minutes: number; seconds: number }

function getTimeLeft(target: number): TimeLeft | null {
  const diff = target - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
  }
}

// Cronômetro regressivo genérico — reaproveitado no banner de campanha
// (Comercial) e nas Condições Comerciais. Diferente do `CountdownBar` da
// landing (faixa fixa `bg-green-800`, com botão de fechar): aqui é só o
// bloco dd:hh:mm:ss, sem opinião de fundo/cor, pra quem chama decidir o
// entorno visual (banner escuro, card claro, etc. via `boxClassName`).
// Esconde-se sozinho (`null`) quando o prazo já passou, mesmo critério já
// usado em "Válido até" (item expirado simplesmente não aparece mais).
export function CountdownTimer({ until, className, boxClassName }: { until: string; className?: string; boxClassName?: string }) {
  const target = new Date(until).getTime()
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => getTimeLeft(target))

  useEffect(() => {
    setTimeLeft(getTimeLeft(target))
    const id = setInterval(() => setTimeLeft(getTimeLeft(target)), 1000)
    return () => clearInterval(id)
  }, [target])

  if (!timeLeft) return null

  const pad = (n: number) => String(n).padStart(2, '0')
  const box = boxClassName ?? 'bg-foreground/10'

  return (
    <div className={className ?? 'flex items-center gap-1 font-mono font-bold text-sm'}>
      {timeLeft.days > 0 && (
        <>
          <span className={`${box} rounded px-1.5 py-0.5`}>{pad(timeLeft.days)}d</span>
          <span className="opacity-40">:</span>
        </>
      )}
      <span className={`${box} rounded px-1.5 py-0.5`}>{pad(timeLeft.hours)}h</span>
      <span className="opacity-40">:</span>
      <span className={`${box} rounded px-1.5 py-0.5`}>{pad(timeLeft.minutes)}m</span>
      <span className="opacity-40">:</span>
      <span className={`${box} rounded px-1.5 py-0.5`}>{pad(timeLeft.seconds)}s</span>
    </div>
  )
}
