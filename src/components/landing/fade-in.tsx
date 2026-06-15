'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type FadeInProps = {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function FadeIn({ children, className, delay = 0 }: FadeInProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn('transition-all duration-700', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6', className)}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}
