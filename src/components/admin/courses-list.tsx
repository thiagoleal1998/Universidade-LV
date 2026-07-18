'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { deleteCourse, reorderCourse } from '@/app/actions/courses'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pencil, Trash2, ChevronUp, ChevronDown, BookOpen, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Course } from '@/lib/supabase/types'

type CourseWithCount = Course & { modules: { count: number }[] }

function ReorderButtons({ course, isFirst, isLast }: { course: CourseWithCount; isFirst: boolean; isLast: boolean }) {
  const [isPending, start] = useTransition()

  function move(dir: 'up' | 'down') {
    start(async () => {
      const r = await reorderCourse(course.id, dir)
      if (r?.error) toast.error(r.error)
    })
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Button variant="ghost" size="icon" className="h-5 w-6 rounded-sm" disabled={isFirst || isPending} onClick={() => move('up')}>
        <ChevronUp className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="icon" className="h-5 w-6 rounded-sm" disabled={isLast || isPending} onClick={() => move('down')}>
        <ChevronDown className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

function DeleteButton({ course }: { course: CourseWithCount }) {
  const [isPending, start] = useTransition()

  function handleDelete() {
    start(async () => {
      const r = await deleteCourse(course.id)
      if (r?.error) toast.error(r.error)
      else toast.success('Curso removido.')
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500" disabled={isPending} />}>
        <Trash2 className="w-4 h-4" />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
          <AlertDialogDescription>
            O curso <strong>{course.name}</strong> será excluído. Os módulos vinculados a ele ficam sem curso mas não são apagados.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function CoursesList({ courses, isAdmin = true }: { courses: CourseWithCount[]; isAdmin?: boolean }) {
  if (courses.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-12">
        Nenhum curso criado ainda. Clique em &quot;Novo Curso&quot; para começar.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {courses.map((course, i) => {
        const moduleCount = course.modules?.[0]?.count ?? 0
        return (
          <div key={course.id} className="flex items-center gap-4 bg-card border rounded-xl p-4">
            {/* Reordenar é global — colaborador (lista parcial) não vê */}
            {isAdmin && <ReorderButtons course={course} isFirst={i === 0} isLast={i === courses.length - 1} />}

            {/* Cover thumbnail */}
            <div className="w-16 h-10 rounded-lg overflow-hidden bg-muted border flex-shrink-0 flex items-center justify-center">
              {course.cover_image_url ? (
                <Image src={course.cover_image_url} alt={course.name} width={64} height={40} className="object-cover w-full h-full" />
              ) : (
                <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{course.name}</span>
                <Badge variant={course.is_published ? 'default' : 'secondary'} className="text-xs">
                  {course.is_published ? 'Publicado' : 'Rascunho'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {moduleCount} {moduleCount === 1 ? 'módulo' : 'módulos'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <Link href={`/admin/cursos/${course.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}>
                <Pencil className="w-4 h-4" />
              </Link>
              <DeleteButton course={course} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
