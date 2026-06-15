'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className={cn('size-8', className)} />

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={className}
      title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}
    >
      {resolvedTheme === 'dark'
        ? <Sun className="w-4 h-4" />
        : <Moon className="w-4 h-4" />
      }
    </Button>
  )
}
