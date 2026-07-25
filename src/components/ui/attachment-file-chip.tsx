'use client'

import { FileText, FileSpreadsheet, File as FileIcon, X } from 'lucide-react'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function iconForMime(mime: string) {
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv')) return FileSpreadsheet
  if (mime.includes('pdf') || mime.includes('word') || mime === 'text/plain') return FileText
  return FileIcon
}

// Cartão de anexo não-imagem (PDF/Word/Excel/texto) — a foto continua com
// thumbnail + lightbox de sempre; isto é só para o que não dá pra prévia.
export function AttachmentFileChip({
  url, fileName, mimeType, sizeBytes, onRemove,
}: {
  url: string
  fileName: string
  mimeType: string
  sizeBytes?: number
  onRemove?: () => void
}) {
  const Icon = iconForMime(mimeType)
  return (
    <div className={`relative flex items-center gap-2 rounded-lg border border-border bg-muted/30 ${onRemove ? 'pr-6' : 'pr-3'} pl-2.5 py-2 max-w-[200px]`}>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={fileName || undefined}
        className="flex items-center gap-2 min-w-0 flex-1 hover:opacity-80 transition-opacity"
        title={fileName || 'Documento'}
      >
        <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium truncate">{fileName || 'Documento'}</span>
          {sizeBytes !== undefined && (
            <span className="block text-[10px] text-muted-foreground">{formatBytes(sizeBytes)}</span>
          )}
        </span>
      </a>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:opacity-80 transition-opacity"
          title="Remover anexo"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}
