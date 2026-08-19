import sharp from 'sharp'
import convertHeic from 'heic-convert'

type ConvertOptions = {
  quality?: number    // WebP quality 1-100, default 82
  maxWidth?: number   // resize se maior que este valor (mantém proporção, nunca amplia)
  maxHeight?: number
}

// Fotos de iPhone (padrão de câmera desde o iOS 11) vêm em HEIC — o build
// padrão do sharp/libvips **não decodifica HEIC de propósito** (só HEIF/AVIF;
// a Sharp remove suporte a HEIC pela restrição de patente do codec HEVC
// embutido nele — confirmado com `sharp.format.heif.input.fileSuffix`, que só
// lista `.avif`). Sem tratamento, um upload de foto direto do iPhone (ex.:
// Ofertas Diárias de Marketing, chamado real do Gustavo) sempre falhava com
// "Tipo de arquivo não suportado", sem explicar o motivo real. `.type` do
// navegador nem sempre vem preenchido pra HEIC (mesmo motivo já documentado
// pra `.ai`/`.psd`), então a extensão do nome do arquivo é checada também.
const HEIC_EXTENSION = /\.(heic|heif)$/i
function isHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || HEIC_EXTENSION.test(file.name)
}

/**
 * Converte qualquer imagem para WebP via sharp.
 * Retorna o File original se:
 *  - não for imagem (PDF, zip, etc.)
 *  - for SVG (vetor — converte para raster perde qualidade)
 *  - já for WebP
 */
export async function toWebP(file: File, opts: ConvertOptions = {}): Promise<File> {
  const heic = isHeic(file)
  if (!heic && !file.type.startsWith('image/')) return file
  if (file.type === 'image/svg+xml') return file
  if (file.type === 'image/webp' && !opts.maxWidth && !opts.maxHeight) return file

  const { quality = 82, maxWidth, maxHeight } = opts

  let buffer = Buffer.from(await file.arrayBuffer())
  if (heic) {
    // heic-convert usa sua própria build WASM do libheif (independente do
    // sharp), só pra essa conversão inicial pra JPEG — o resto do pipeline
    // (resize/qualidade/webp) continua sendo o sharp de sempre, sem mudança.
    buffer = Buffer.from(await convertHeic({ buffer, format: 'JPEG', quality: 0.92 }))
  }

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
