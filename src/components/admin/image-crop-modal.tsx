'use client'

import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import type { Area, Point } from 'react-easy-crop'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { ZoomIn, ZoomOut } from 'lucide-react'

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new window.Image()
  image.crossOrigin = 'anonymous'
  image.src = imageSrc
  await new Promise<void>((resolve) => { image.onload = () => resolve() })

  const canvas = document.createElement('canvas')
  const size = Math.min(pixelCrop.width, pixelCrop.height)
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y,
    pixelCrop.width, pixelCrop.height,
    0, 0,
    size, size,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => { blob ? resolve(blob) : reject(new Error('Falha ao gerar imagem')) },
      'image/jpeg',
      0.92,
    )
  })
}

type Props = {
  imageSrc: string | null
  onClose: () => void
  onConfirm: (blob: Blob) => void
}

export function ImageCropModal({ imageSrc, onClose, onConfirm }: Props) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels)
  }, [])

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return
    setIsProcessing(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onConfirm(blob)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={!!imageSrc} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Ajustar foto do instrutor</DialogTitle>
        </DialogHeader>

        {/* Área de recorte */}
        <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ height: 280 }}>
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        {/* Controle de zoom */}
        <div className="flex items-center gap-3 px-1">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary h-1.5 rounded-full"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground text-center -mt-1">
          Arraste para reposicionar · Use o controle para aproximar
        </p>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing} className="gap-2">
            {isProcessing && <Spinner className="w-4 h-4" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
