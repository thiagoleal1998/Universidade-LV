'use client'

import { useState, useTransition, useRef } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { updateLesson, setLessonPublished, uploadLessonPhoto, deleteLessonPhoto, uploadLessonAttachment, deleteLessonAttachment, uploadContentImage } from '@/app/actions/lessons'
import type { Lesson, LessonAttachment } from '@/lib/supabase/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Trash2, Upload, Video, Image as ImageIcon, Paperclip, FileText, FileSpreadsheet, FileImage, File, Clock, X, Table2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { RichTextEditor } from './rich-text-editor'
import { LessonTaskEditor } from './lesson-task-editor'
import type { LessonTask } from '@/app/actions/lesson-tasks'
import Image from 'next/image'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function AttachmentIcon({ mime }: { mime: string }) {
  if (mime.startsWith('image/')) return <FileImage className="w-4 h-4 text-blue-500" />
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-green-600" />
  if (mime.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
  return <File className="w-4 h-4 text-muted-foreground" />
}

function getSheetEmbedUrl(url: string): string | null {
  if (!url.trim()) return null
  // Google Sheets — qualquer URL do sheets (edit, view, htmlview, pub)
  const gsMatch = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (gsMatch) {
    const id = gsMatch[1]
    const gidMatch = url.match(/[?&]gid=(\d+)/)
    const gid = gidMatch ? `?gid=${gidMatch[1]}` : ''
    // /htmlview não exige "Publicar na web" — basta "Qualquer pessoa com o link pode ver"
    return `https://docs.google.com/spreadsheets/d/${id}/htmlview${gid}`
  }
  // Microsoft Excel / Office Online embed
  if (url.includes('sharepoint.com') || url.includes('office.com') || url.includes('onedrive.live.com')) {
    return url.includes('action=embedview') ? url : `${url}&action=embedview`
  }
  return null
}

function getVideoEmbedUrl(url: string): string | null {
  const s = url.trim()
  if (!s) return null

  // Google Drive — captura o ID de qualquer variação de URL do Drive
  if (s.includes('google.com')) {
    // Formato /file/d/{ID}
    const fileMatch = s.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/)
    if (fileMatch) return `https://drive.google.com/file/d/${fileMatch[1]}/preview`
    // Formato ?id={ID} ou &id={ID}
    const idMatch = s.match(/[?&]id=([a-zA-Z0-9_-]{15,})/)
    if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`
  }

  // YouTube
  try {
    const u = new URL(s)
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.slice(1).split('?')[0]
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtube.com')) {
      if (u.pathname.startsWith('/shorts/')) {
        const id = u.pathname.split('/')[2]
        return id ? `https://www.youtube.com/embed/${id}` : null
      }
      if (u.pathname.startsWith('/embed/')) return s
      const v = u.searchParams.get('v')
      return v ? `https://www.youtube.com/embed/${v}` : null
    }
  } catch {
    // URL incompleta
  }
  return null
}

type PhotoWithUrl = {
  id: string
  storage_path: string
  caption: string
  order_index: number
  url: string
}

type AttachmentWithUrl = LessonAttachment & { url: string }

export function LessonEditor({
  lesson,
  photos,
  attachments = [],
  task = null,
}: {
  lesson: Lesson & { publish_at?: string | null }
  photos: PhotoWithUrl[]
  attachments?: AttachmentWithUrl[]
  task?: LessonTask | null
}) {
  const [isPending, startTransition] = useTransition()
  const [isPublishPending, startPublishTransition] = useTransition()
  const [contentText, setContentText] = useState(lesson.content_text ?? '')
  const [isPublished, setIsPublished] = useState(lesson.is_published)
  const [youtubeUrl, setYoutubeUrl] = useState(lesson.youtube_url ?? '')
  const [sheetUrl, setSheetUrl] = useState(lesson.sheet_url ?? '')
  const [showSchedule, setShowSchedule] = useState(!!lesson.publish_at)
  const [isUploading, startPhotoUpload] = useTransition()
  const [isUploadingAttachment, startAttachmentUpload] = useTransition()
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false)
  const [isDraggingAttachment, setIsDraggingAttachment] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const attachmentRef = useRef<HTMLInputElement>(null)

  const defaultScheduleDatetime = lesson.publish_at
    ? new Date(lesson.publish_at).toISOString().slice(0, 16)
    : ''

  // Pending photo state (replaces window.prompt)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingCaption, setPendingCaption] = useState('')
  const [pendingPreview, setPendingPreview] = useState<string | null>(null)

  async function handleSave(formData: FormData) {
    formData.set('content_text', contentText)
    formData.set('is_published', String(isPublished))
    if (!showSchedule) formData.delete('publish_at')
    startTransition(async () => {
      const result = await updateLesson(lesson.id, lesson.module_id, formData)
      if (result?.error) toast.error(result.error)
      else toast.success('Aula salva!')
    })
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be selected again later
    e.target.value = ''
    const url = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingCaption('')
    setPendingPreview(url)
  }

  function clearPendingPhoto() {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setPendingFile(null)
    setPendingCaption('')
    setPendingPreview(null)
  }

  function handleConfirmPhotoUpload() {
    if (!pendingFile) return
    startPhotoUpload(async () => {
      const result = await uploadLessonPhoto(lesson.id, pendingFile, pendingCaption)
      if (result?.error) toast.error(result.error)
      else { toast.success('Foto adicionada!'); clearPendingPhoto() }
    })
  }

  async function handleDeletePhoto(photoId: string, storagePath: string) {
    const result = await deleteLessonPhoto(photoId, storagePath, lesson.id)
    if (result?.error) toast.error(result.error)
    else toast.success('Foto removida.')
  }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    startAttachmentUpload(async () => {
      const result = await uploadLessonAttachment(lesson.id, file)
      if (result?.error) toast.error(result.error)
      else toast.success('Anexo adicionado!')
    })
  }

  async function handleDeleteAttachment(id: string, storagePath: string) {
    const result = await deleteLessonAttachment(id, storagePath, lesson.id)
    if (result?.error) toast.error(result.error)
    else toast.success('Anexo removido.')
  }

  function handlePhotoDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingPhoto(false)
    if (pendingFile) return
    const file = e.dataTransfer.files[0]
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Solte uma imagem válida.')
      return
    }
    const url = URL.createObjectURL(file)
    setPendingFile(file)
    setPendingCaption('')
    setPendingPreview(url)
  }

  function handleAttachmentDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDraggingAttachment(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    startAttachmentUpload(async () => {
      const result = await uploadLessonAttachment(lesson.id, file)
      if (result?.error) toast.error(result.error)
      else toast.success('Anexo adicionado!')
    })
  }

  return (
    <div className="space-y-8">
      <form id="lesson-form" action={handleSave} className="space-y-6 bg-card border rounded-lg p-6">
        <div className="space-y-2">
          <Label>Título</Label>
          <Input name="title" defaultValue={lesson.title} required />
        </div>

        <div className="space-y-2">
          <Label>Descrição</Label>
          <Input name="description" defaultValue={lesson.description} />
        </div>

        <Separator />

        {/* Vídeo (YouTube ou Google Drive) */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Video className="w-4 h-4 text-red-500" />
            URL do Vídeo (YouTube ou Google Drive)
          </Label>
          <Input
            name="youtube_url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=... ou https://drive.google.com/file/d/..."
          />
          {youtubeUrl.trim() && !getVideoEmbedUrl(youtubeUrl) && (
            <p className="text-xs text-amber-600">
              {youtubeUrl.includes('/folders/')
                ? 'Este link é de uma pasta do Drive. Abra o vídeo dentro da pasta, clique com o botão direito → "Compartilhar" → copie o link do arquivo.'
                : 'URL não reconhecida. Use o link de compartilhamento de um arquivo de vídeo do Google Drive ou um link do YouTube.'}
            </p>
          )}
          {youtubeUrl.trim() && youtubeUrl.includes('drive.google.com') && getVideoEmbedUrl(youtubeUrl) && (
            <p className="text-xs text-muted-foreground">
              Google Drive: o arquivo precisa estar compartilhado como <strong>Qualquer pessoa com o link → Visualizador</strong>.
            </p>
          )}
          {(() => {
            const embedUrl = getVideoEmbedUrl(youtubeUrl)
            if (!embedUrl) return null
            return (
              <div className="rounded-xl overflow-hidden border border-border aspect-video w-full">
                <iframe
                  src={embedUrl}
                  title="Prévia do vídeo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            )
          })()}
        </div>

        <Separator />

        {/* Planilha incorporada */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Table2 className="w-4 h-4 text-green-600" />
            Link de Planilha (Google Sheets, Excel Online)
          </Label>
          <Input
            name="sheet_url"
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/..."
          />
          <p className="text-xs text-muted-foreground">
            Google Sheets: clique em <strong>Compartilhar → Qualquer pessoa com o link → Visualizador</strong> e cole o link aqui. Não é necessário publicar na web.
          </p>
          {sheetUrl.trim() && !getSheetEmbedUrl(sheetUrl) && (
            <p className="text-xs text-amber-600">
              URL não reconhecida. Use o link de compartilhamento do Google Sheets ou Excel Online.
            </p>
          )}
          {getSheetEmbedUrl(sheetUrl) && (
            <div className="rounded-xl overflow-hidden border border-border w-full" style={{ height: 360 }}>
              <iframe
                src={getSheetEmbedUrl(sheetUrl)!}
                title="Prévia da planilha"
                className="w-full h-full"
              />
            </div>
          )}
        </div>

        <Separator />

        {/* Editor de texto rico */}
        <div className="space-y-2">
          <Label>Conteúdo (texto)</Label>
          <RichTextEditor
            content={contentText}
            onChange={setContentText}
            onImageUpload={async (file) => {
              const r = await uploadContentImage(lesson.id, file)
              if (r?.error) { toast.error(r.error); return null }
              return r.url ?? null
            }}
          />
        </div>

      </form>

      {/* Galeria de Fotos */}
      <div
        className={cn(
          'bg-card border rounded-lg p-6 transition-colors',
          isDraggingPhoto && 'border-primary bg-primary/5 border-dashed',
        )}
        onDragOver={(e) => { e.preventDefault(); if (!pendingFile) setIsDraggingPhoto(true) }}
        onDragLeave={() => setIsDraggingPhoto(false)}
        onDrop={handlePhotoDrop}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Galeria de Fotos ({photos.length})
          </h3>
          {!pendingFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              Adicionar Foto
            </Button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Inline photo confirm panel */}
        {pendingFile && pendingPreview && (
          <div className="mb-4 border rounded-lg p-4 bg-muted/30 space-y-3">
            <p className="text-sm font-medium text-foreground">Confirmar foto</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingPreview}
              alt="Preview"
              className="w-full max-h-48 object-cover rounded-lg border"
            />
            <Input
              placeholder="Legenda (opcional)"
              value={pendingCaption}
              onChange={(e) => setPendingCaption(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleConfirmPhotoUpload() } }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleConfirmPhotoUpload}
                disabled={isUploading}
                className="flex-1 gap-1.5"
              >
                {isUploading ? <><Spinner className="w-3.5 h-3.5" /> Enviando...</> : <><Upload className="w-3.5 h-3.5" /> Adicionar à galeria</>}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={clearPendingPhoto} disabled={isUploading}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {photos.length === 0 && !pendingFile ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground select-none pointer-events-none">
            <Upload className="w-6 h-6 opacity-40" />
            <p className="text-sm">Arraste uma imagem aqui ou clique em "Adicionar Foto"</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group rounded-lg overflow-hidden border">
                <Image
                  src={photo.url}
                  alt={photo.caption}
                  width={300}
                  height={200}
                  className="w-full h-36 object-cover"
                />
                {photo.caption && (
                  <p className="text-xs text-muted-foreground px-2 py-1 truncate">{photo.caption}</p>
                )}
                <AlertDialog>
                  <AlertDialogTrigger render={<button className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                    <Trash2 className="w-3 h-3" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover foto?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeletePhoto(photo.id, photo.storage_path)}
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anexos para Download */}
      <div
        className={cn(
          'bg-card border rounded-lg p-6 transition-colors',
          isDraggingAttachment && 'border-primary bg-primary/5 border-dashed',
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDraggingAttachment(true) }}
        onDragLeave={() => setIsDraggingAttachment(false)}
        onDrop={handleAttachmentDrop}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            Anexos para Download ({attachments.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => attachmentRef.current?.click()}
            disabled={isUploadingAttachment}
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploadingAttachment ? 'Enviando...' : 'Adicionar Arquivo'}
          </Button>
          <input
            ref={attachmentRef}
            type="file"
            className="hidden"
            onChange={handleAttachmentUpload}
          />
        </div>

        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-8 text-muted-foreground select-none pointer-events-none">
            <Paperclip className="w-6 h-6 opacity-40" />
            <p className="text-sm">Arraste um arquivo aqui ou clique em "Adicionar Arquivo"</p>
          </div>
        ) : (
          <div className="space-y-2">
            {attachments.map((att) => (
              <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 group">
                <AttachmentIcon mime={att.mime_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(att.size_bytes)}</p>
                </div>
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Abrir
                </a>
                <AlertDialog>
                  <AlertDialogTrigger render={
                    <button className="text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0" title="Remover" />
                  }>
                    <Trash2 className="w-4 h-4" />
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover anexo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O arquivo <strong>{att.name}</strong> será removido permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteAttachment(att.id, att.storage_path)}>
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tarefa */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-foreground text-sm">Tarefa</h3>
          <span className="text-xs text-muted-foreground">— questões que o membro deve responder</span>
        </div>

        {/* Período da tarefa */}
        <div className="bg-card border rounded-lg px-5 py-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Período para envio</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task_start_date" className="text-xs text-muted-foreground">Data de início</Label>
              <Input
                id="task_start_date"
                name="task_start_date"
                type="date"
                form="lesson-form"
                defaultValue={lesson.task_start_date ?? ''}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task_end_date" className="text-xs text-muted-foreground">Data de encerramento</Label>
              <Input
                id="task_end_date"
                name="task_end_date"
                type="date"
                form="lesson-form"
                defaultValue={lesson.task_end_date ?? ''}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Deixe em branco para não exibir prazo ao aluno.
          </p>
        </div>

        <LessonTaskEditor task={task} lessonId={lesson.id} />
      </div>

      {/* Save bar — always at the bottom of the page */}
      <div className="bg-card border rounded-lg px-6 py-4 space-y-3">
        {showSchedule && (
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="flex items-center gap-1.5 text-sm shrink-0">
              <Clock className="w-3.5 h-3.5" />
              Publicar em
            </Label>
            <Input
              type="datetime-local"
              name="publish_at"
              form="lesson-form"
              defaultValue={defaultScheduleDatetime}
              min={new Date().toISOString().slice(0, 16)}
              className="w-auto"
            />
            <button
              type="button"
              onClick={() => setShowSchedule(false)}
              className="text-muted-foreground hover:text-foreground"
              title="Remover agendamento"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex flex-wrap gap-3 items-center">
          <Button type="submit" form="lesson-form" disabled={isPending} className="gap-1.5">
            {isPending ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar Aula'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const next = !isPublished
              setIsPublished(next)
              startPublishTransition(async () => {
                const result = await setLessonPublished(lesson.id, lesson.module_id, next)
                if (result?.error) {
                  toast.error(result.error)
                  setIsPublished(!next)
                } else {
                  toast.success(next ? 'Aula publicada!' : 'Aula despublicada.')
                }
              })
            }}
            disabled={isPending || isPublishPending}
          >
            {isPublishPending ? <Spinner className="w-4 h-4" /> : (isPublished ? 'Despublicar' : 'Publicar')}
          </Button>
          {!showSchedule && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSchedule(true)}
              disabled={isPending}
              className="gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              Agendar
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Status: <strong>{isPublished ? 'Publicada' : 'Rascunho'}</strong>
          </span>
        </div>
      </div>
    </div>
  )
}
