'use client'

import { useState, useTransition, useRef } from 'react'
import Image from 'next/image'
import { updateCourse, uploadCourseCover, toggleCoursePublished, uploadInstructorPhoto } from '@/app/actions/courses'
import { ImageCropModal } from '@/components/admin/image-crop-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { ImageIcon, Upload, UserCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Course } from '@/lib/supabase/types'

export function CourseEditor({ course }: { course: Course }) {
  const [isPending, startTransition] = useTransition()
  const [isToggling, startToggle] = useTransition()
  const [isUploading, startUpload] = useTransition()
  const [isUploadingPhoto, startUploadPhoto] = useTransition()
  const [isPublished, setIsPublished] = useState(course.is_published)
  const [coverUrl, setCoverUrl] = useState(course.cover_image_url)
  const [name, setName] = useState(course.name)
  const [description, setDescription] = useState(course.description)
  const [instructorName, setInstructorName] = useState(course.instructor_name ?? '')
  const [instructorRole, setInstructorRole] = useState(course.instructor_role ?? '')
  const [instructorPhotoUrl, setInstructorPhotoUrl] = useState(course.instructor_photo_url ?? '')
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  function handleSave(formData: FormData) {
    formData.set('is_published', String(isPublished))
    formData.set('instructor_name', instructorName)
    formData.set('instructor_role', instructorRole)
    startTransition(async () => {
      const r = await updateCourse(course.id, formData)
      if (r?.error) toast.error(r.error)
      else toast.success('Curso salvo!')
    })
  }

  function handleInstructorPhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const objectUrl = URL.createObjectURL(file)
    setCropSrc(objectUrl)
  }

  function handleCropConfirm(blob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    const file = new File([blob], 'instructor.jpg', { type: 'image/jpeg' })
    startUploadPhoto(async () => {
      const r = await uploadInstructorPhoto(course.id, file)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Foto do instrutor atualizada!')
        if (r.url) setInstructorPhotoUrl(r.url)
      }
    })
  }

  function handleCropClose() {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    startUpload(async () => {
      const r = await uploadCourseCover(course.id, file)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Imagem atualizada!')
        if (r.url) setCoverUrl(r.url)
      }
    })
  }

  return (
    <form action={handleSave} className="bg-card border rounded-xl overflow-hidden">
      {/* Cover image */}
      <div className="relative w-full h-44 bg-muted group cursor-pointer" onClick={() => fileRef.current?.click()}>
        {coverUrl ? (
          <Image src={coverUrl} alt={course.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="w-8 h-8" />
            <span className="text-sm">Clique para adicionar imagem de capa</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-sm font-medium">
          <Upload className="w-4 h-4" />
          {isUploading ? 'Enviando...' : 'Alterar imagem'}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
      </div>

      {/* Fields */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do curso</Label>
          <Input id="name" name="name" value={name} onChange={e => setName(e.target.value)} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descreva o objetivo e conteúdo deste curso..."
            rows={3}
          />
        </div>

        {/* Instrutor */}
        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-sm font-medium text-foreground">Instrutor(a)</p>

          {/* Foto */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => photoRef.current?.click()}
              className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-border hover:border-primary transition-colors bg-muted flex items-center justify-center shrink-0 group"
            >
              {instructorPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={instructorPhotoUrl} alt="Foto do instrutor" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Upload className="w-4 h-4 text-white" />
              </div>
            </button>
            <div className="flex-1 space-y-1">
              <p className="text-xs text-muted-foreground">
                {isUploadingPhoto ? 'Enviando...' : 'Clique na imagem para alterar a foto'}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => photoRef.current?.click()}
                disabled={isUploadingPhoto}
                className="gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                {instructorPhotoUrl ? 'Alterar foto' : 'Adicionar foto'}
              </Button>
            </div>
            <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handleInstructorPhotoSelect} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="instructor_name">Nome do(a) instrutor(a)</Label>
              <Input
                id="instructor_name"
                name="instructor_name"
                value={instructorName}
                onChange={e => setInstructorName(e.target.value)}
                placeholder="Ex: Ana Costa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instructor_role">Título / Cargo</Label>
              <Input
                id="instructor_role"
                name="instructor_role"
                value={instructorRole}
                onChange={e => setInstructorRole(e.target.value)}
                placeholder="Ex: Especialista em turismo"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-2 items-center pt-1">
          <Button type="submit" disabled={isPending}>
            {isPending ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newValue = !isPublished
              setIsPublished(newValue)
              startToggle(async () => {
                const r = await toggleCoursePublished(course.id, newValue)
                if (r?.error) { toast.error(r.error); setIsPublished(!newValue) }
                else toast.success(newValue ? 'Curso publicado!' : 'Curso despublicado!')
              })
            }}
            disabled={isPending || isToggling}
          >
            {isToggling ? <><Spinner className="w-4 h-4" /> Salvando...</> : isPublished ? 'Despublicar' : 'Publicar'}
          </Button>
          <span className="text-sm text-muted-foreground">
            Status: <strong>{isPublished ? 'Publicado' : 'Rascunho'}</strong>
          </span>
        </div>
      </div>
      <ImageCropModal
        imageSrc={cropSrc}
        onClose={handleCropClose}
        onConfirm={handleCropConfirm}
      />
    </form>
  )
}
