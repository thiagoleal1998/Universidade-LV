'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useSettings } from '@/components/providers/settings-provider'

export function Spinner({ className }: { className?: string }) {
  const settings = useSettings()

  if (settings.loading_image_url) {
    return (
      <Image
        src={settings.loading_image_url}
        alt="Carregando..."
        width={48}
        height={48}
        className={cn('animate-spin object-contain', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin',
        className,
      )}
    />
  )
}
