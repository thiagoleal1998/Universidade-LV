'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { reorderModule } from '@/app/actions/modules'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Pencil, Eye, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import type { Module } from '@/lib/supabase/types'

type ModuleWithCount = Module & { lessons: { count: number }[] }

function ReorderButtons({ mod, isFirst, isLast }: { mod: ModuleWithCount; isFirst: boolean; isLast: boolean }) {
  const [isPending, startTransition] = useTransition()

  function move(direction: 'up' | 'down') {
    startTransition(async () => {
      const result = await reorderModule(mod.id, direction)
      if (result?.error) toast.error(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Button
        variant="ghost" size="icon"
        className="h-5 w-6 rounded-sm"
        disabled={isFirst || isPending}
        onClick={() => move('up')}
      >
        <ChevronUp className="w-3.5 h-3.5" />
      </Button>
      <Button
        variant="ghost" size="icon"
        className="h-5 w-6 rounded-sm"
        disabled={isLast || isPending}
        onClick={() => move('down')}
      >
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

export function ModulesList({ modules, isAdmin = true }: { modules: ModuleWithCount[]; isAdmin?: boolean }) {
  if (modules.length === 0) return (
    <p className="text-muted-foreground text-center py-12">
      Nenhum módulo criado ainda. Clique em "Novo Módulo" para começar.
    </p>
  )

  return (
    <div className="space-y-3">
      {modules.map((mod, i) => (
        <div key={mod.id} className="flex items-center justify-between bg-card border rounded-lg px-5 py-4 gap-4">
          <div className="flex items-center gap-3">
            {/* Reordenar é global — colaborador (lista parcial) não vê */}
            {isAdmin && <ReorderButtons mod={mod} isFirst={i === 0} isLast={i === modules.length - 1} />}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{mod.title}</span>
                <Badge variant={mod.is_published ? 'default' : 'secondary'}>
                  {mod.is_published ? 'Publicado' : 'Rascunho'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {mod.lessons?.[0]?.count ?? 0} aulas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Link
              href={`/dashboard/modulos/${mod.id}`}
              target="_blank"
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), !mod.is_published && 'text-muted-foreground')}
              title={mod.is_published ? 'Ver página' : 'Ver prévia'}
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link href={`/admin/modulos/${mod.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
              <Pencil className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}
