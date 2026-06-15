'use client'

import { useState, useRef, useEffect, useLayoutEffect, useTransition, useCallback } from 'react'
import Image from 'next/image'
import { uploadCertificateTemplate, saveCertificateNamePosition } from '@/app/actions/certificates'
import { HANDWRITING_FONTS, FONTS_IMPORT_URL } from '@/lib/fonts'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  currentUrl: string
  nameX: string
  nameY: string
  nameFont: string
  nameSize: string
  nameColor: string
}

const PREVIEW_MEMBER_NAME = 'Nome do Membro'

export function CertificatePositionEditor({ currentUrl, nameX, nameY, nameFont, nameSize, nameColor }: Props) {
  const [imageUrl, setImageUrl] = useState(currentUrl)
  const [x, setX] = useState(parseFloat(nameX) || 50)
  const [y, setY] = useState(parseFloat(nameY) || 50)
  const [font, setFont] = useState(nameFont || 'Dancing Script')
  const [size, setSize] = useState(parseFloat(nameSize) || 60)
  const [color, setColor] = useState(nameColor || '#1a1a1a')
  const [previewWidth, setPreviewWidth] = useState(800)
  const [isUploading, startUpload] = useTransition()
  const [isSaving, startSave] = useTransition()

  const previewRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const originalUrlRef = useRef(currentUrl)

  useLayoutEffect(() => {
    if (previewRef.current) setPreviewWidth(previewRef.current.offsetWidth)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (previewRef.current) setPreviewWidth(previewRef.current.offsetWidth)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    setX(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
    setY(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)))
  }, [])

  const handleMouseUp = useCallback(() => { isDragging.current = false }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  function handlePreviewMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    setX(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)))
    setY(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)))
    isDragging.current = true
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setImageUrl(localUrl)
    const fd = new FormData()
    fd.append('file', file)
    startUpload(async () => {
      const result = await uploadCertificateTemplate(fd)
      if ('error' in result && result.error) {
        toast.error(result.error)
        setImageUrl(originalUrlRef.current)
      } else if ('url' in result && result.url) {
        toast.success('Modelo carregado com sucesso!')
        setImageUrl(result.url)
        originalUrlRef.current = result.url
      }
    })
  }

  function handleSavePosition() {
    startSave(async () => {
      const result = await saveCertificateNamePosition({
        x: x.toFixed(2),
        y: y.toFixed(2),
        font,
        size: size.toFixed(0),
        color,
      })
      if ('error' in result && result.error) toast.error((result as { error: string }).error)
      else toast.success('Posição e fonte salvas!')
    })
  }

  const scaledFontSize = size * (previewWidth / 1122)

  return (
    <div className="space-y-6 pt-4 border-t border-border">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTS_IMPORT_URL} />

      {/* Upload */}
      <div className="space-y-2">
        <Label>Imagem do modelo</Label>
        <p className="text-xs text-muted-foreground">
          PNG ou JPG, proporção A4 paisagem (recomendado 1122 × 794 px).
        </p>
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileChange}
          disabled={isUploading}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
        />
        {isUploading && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner className="w-3 h-3" /> Enviando imagem...
          </p>
        )}
      </div>

      {/* Preview + drag */}
      <div className="space-y-2">
        <Label>Pré-visualização — clique ou arraste o nome para posicioná-lo</Label>
        <div
          ref={previewRef}
          onMouseDown={handlePreviewMouseDown}
          className="relative w-full overflow-hidden rounded-lg border border-border bg-muted/20 select-none cursor-crosshair"
          style={{ paddingBottom: '70.7%' }}
        >
          <div className="absolute inset-0">
            {imageUrl ? (
              <Image src={imageUrl} alt="Modelo" fill className="object-contain" unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Faça upload do modelo acima para ver a prévia</p>
              </div>
            )}
            {/* Draggable name overlay */}
            <div
              className="absolute pointer-events-none"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
                fontFamily: `'${font}', cursive`,
                fontSize: `${scaledFontSize}px`,
                color,
                whiteSpace: 'nowrap',
                lineHeight: 1,
                textShadow: '0 1px 4px rgba(255,255,255,0.6), 0 -1px 4px rgba(0,0,0,0.15)',
              }}
            >
              {PREVIEW_MEMBER_NAME}
            </div>
            {/* Visual crosshair indicator */}
            <div
              className="absolute w-3 h-3 pointer-events-none"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="absolute top-1/2 left-0 w-full h-px bg-primary/60" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-primary/60" />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Posição: X {x.toFixed(1)}% / Y {y.toFixed(1)}%
        </p>
      </div>

      {/* Font picker */}
      <div className="space-y-2">
        <Label>Fonte do nome</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {HANDWRITING_FONTS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFont(f.id)}
              className={cn(
                'rounded-lg border-2 px-2 py-3 text-center transition-all',
                font === f.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-muted-foreground/40'
              )}
            >
              <p
                style={{ fontFamily: `'${f.id}', cursive`, fontSize: 22, lineHeight: 1.4 }}
                className="text-foreground"
              >
                Aa
              </p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{f.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Size + color */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Tamanho — {size}px</Label>
          <input
            type="range"
            min={18}
            max={120}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
        <div className="space-y-2">
          <Label>Cor do nome</Label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent p-0.5"
            />
            <span className="font-mono text-sm text-muted-foreground">{color}</span>
          </div>
        </div>
      </div>

      <Button onClick={handleSavePosition} disabled={isSaving} className="gap-2">
        {isSaving ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar posição e fonte'}
      </Button>
    </div>
  )
}
