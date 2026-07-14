import sharp from 'sharp'

type ConvertOptions = {
  quality?: number    // WebP quality 1-100, default 82
  maxWidth?: number   // resize se maior que este valor (mantém proporção, nunca amplia)
  maxHeight?: number
}

/**
 * Converte qualquer imagem para WebP via sharp.
 * Retorna o File original se:
 *  - não for imagem (PDF, zip, etc.)
 *  - for SVG (vetor — converte para raster perde qualidade)
 *  - já for WebP
 */
export async function toWebP(file: File, opts: ConvertOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  if (file.type === 'image/svg+xml') return file
  if (file.type === 'image/webp' && !opts.maxWidth && !opts.maxHeight) return file

  const { quality = 82, maxWidth, maxHeight } = opts

  const buffer = Buffer.from(await file.arrayBuffer())
  let pipeline = sharp(buffer)

  if (maxWidth || maxHeight) {
    pipeline = pipeline.resize(maxWidth ?? undefined, maxHeight ?? undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    })
  }

  const webpBuffer = await pipeline.webp({ quality }).toBuffer()
  const baseName = file.name.replace(/\.[^/.]+$/, '')

  return new File([new Uint8Array(webpBuffer)], `${baseName}.webp`, { type: 'image/webp' })
}
