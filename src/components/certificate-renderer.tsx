import Image from 'next/image'
import { FONTS_IMPORT_URL } from '@/lib/fonts'

export interface CertificateData {
  memberName: string
  moduleName: string
  siteName: string
  logoUrl: string
  issuedAt: string
  signatoryName: string
  signatoryRole: string
  template: string
  customTemplateUrl?: string
  nameX?: string
  nameY?: string
  nameFont?: string
  nameSize?: string
  nameColor?: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function ClassicTemplate({ d }: { d: CertificateData }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center px-16 py-12"
      style={{ fontFamily: 'Georgia, serif', background: '#fffef7', color: '#2c1f0e' }}
    >
      <div className="absolute inset-3 border-4 border-amber-400 pointer-events-none" />
      <div className="absolute inset-5 border border-amber-300 pointer-events-none" />

      {d.logoUrl && (
        <div className="mb-6 relative w-16 h-16">
          <Image src={d.logoUrl} alt={d.siteName} fill className="object-contain" />
        </div>
      )}
      <p className="text-xs uppercase tracking-[0.3em] text-amber-700 mb-2">{d.siteName}</p>
      <h1 className="text-3xl font-bold uppercase tracking-widest text-amber-800 mb-8">
        Certificado de Conclusão
      </h1>
      <p className="text-base text-stone-600 mb-4">Certificamos que</p>
      <p className="text-4xl font-bold mb-6" style={{ fontFamily: 'Georgia, serif' }}>{d.memberName}</p>
      <div className="w-32 h-px bg-amber-400 mb-6" />
      <p className="text-base text-stone-600 mb-2">concluiu com êxito o módulo</p>
      <p className="text-2xl font-semibold text-amber-800 mb-10">{d.moduleName}</p>

      <div className="mt-auto w-full flex justify-between items-end text-sm text-stone-500">
        <p>{formatDate(d.issuedAt)}</p>
        {d.signatoryName && (
          <div className="text-center">
            <div className="w-32 h-px bg-stone-400 mb-1 mx-auto" />
            <p className="font-medium text-stone-700">{d.signatoryName}</p>
            {d.signatoryRole && <p className="text-xs">{d.signatoryRole}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function ModernTemplate({ d }: { d: CertificateData }) {
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{ fontFamily: 'system-ui, sans-serif', background: '#ffffff', color: '#111827' }}
    >
      <div className="h-3 w-full bg-blue-600 shrink-0" />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1.5 bg-blue-100 shrink-0" />

        <div className="flex-1 flex flex-col justify-center px-14 py-10">
          <div className="flex items-center gap-4 mb-10">
            {d.logoUrl && (
              <div className="relative w-12 h-12 shrink-0">
                <Image src={d.logoUrl} alt={d.siteName} fill className="object-contain" />
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-blue-600">{d.siteName}</p>
              <p className="text-xs text-gray-400 uppercase tracking-widest">Certificado de Conclusão</p>
            </div>
          </div>

          <p className="text-sm text-gray-400 mb-1">Este certificado é concedido a</p>
          <p className="text-5xl font-bold text-gray-900 mb-6 leading-tight">{d.memberName}</p>
          <p className="text-sm text-gray-500 mb-1">pela conclusão do módulo</p>
          <p className="text-2xl font-semibold text-blue-600 mb-12">{d.moduleName}</p>

          <div className="flex justify-between items-end">
            <p className="text-sm text-gray-400">{formatDate(d.issuedAt)}</p>
            {d.signatoryName && (
              <div className="text-right">
                <div className="w-28 h-px bg-gray-300 mb-1 ml-auto" />
                <p className="text-sm font-semibold text-gray-700">{d.signatoryName}</p>
                {d.signatoryRole && <p className="text-xs text-gray-400">{d.signatoryRole}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-1 w-full bg-blue-600 shrink-0" />
    </div>
  )
}

function ElegantTemplate({ d }: { d: CertificateData }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center text-center px-16 py-12 relative"
      style={{ fontFamily: 'Georgia, serif', background: '#0f172a', color: '#f8fafc' }}
    >
      <div className="absolute top-4 left-4 w-10 h-10 border-t-2 border-l-2 border-amber-400" />
      <div className="absolute top-4 right-4 w-10 h-10 border-t-2 border-r-2 border-amber-400" />
      <div className="absolute bottom-4 left-4 w-10 h-10 border-b-2 border-l-2 border-amber-400" />
      <div className="absolute bottom-4 right-4 w-10 h-10 border-b-2 border-r-2 border-amber-400" />

      {d.logoUrl && (
        <div className="mb-5 relative w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400">
          <Image src={d.logoUrl} alt={d.siteName} fill className="object-contain" />
        </div>
      )}
      <p className="text-xs uppercase tracking-[0.4em] text-amber-400 mb-2">{d.siteName}</p>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px flex-1 bg-amber-400/40" />
        <p className="text-sm uppercase tracking-widest text-amber-300">Certificado de Conclusão</p>
        <div className="h-px flex-1 bg-amber-400/40" />
      </div>

      <p className="text-sm text-slate-400 mb-3">Outorgamos o presente certificado a</p>
      <p className="text-4xl font-bold text-amber-300 mb-5">{d.memberName}</p>
      <p className="text-sm text-slate-400 mb-2">pela conclusão integral do módulo</p>
      <p className="text-xl font-semibold text-white mb-10">{d.moduleName}</p>

      <div className="w-24 h-px bg-amber-400/60 mb-10" />

      <div className="w-full flex justify-between items-end text-xs text-slate-500">
        <p>{formatDate(d.issuedAt)}</p>
        {d.signatoryName && (
          <div className="text-center">
            <div className="w-24 h-px bg-amber-400/40 mb-1 mx-auto" />
            <p className="text-amber-300 font-medium text-xs">{d.signatoryName}</p>
            {d.signatoryRole && <p className="text-slate-500 text-xs">{d.signatoryRole}</p>}
          </div>
        )}
      </div>
    </div>
  )
}

function CustomTemplate({ d, scaleFactor = 1 }: { d: CertificateData; scaleFactor?: number }) {
  const font = d.nameFont || 'Dancing Script'
  const size = parseFloat(d.nameSize || '60') * scaleFactor
  const color = d.nameColor || '#1a1a1a'
  const x = parseFloat(d.nameX || '50')
  const y = parseFloat(d.nameY || '50')

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href={FONTS_IMPORT_URL} />
      {d.customTemplateUrl ? (
        <Image
          src={d.customTemplateUrl}
          alt="Modelo de certificado"
          fill
          className="object-contain"
          unoptimized
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted/30 border-2 border-dashed border-border">
          <p className="text-muted-foreground text-sm">Nenhum modelo personalizado carregado</p>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: `${x}%`,
          top: `${y}%`,
          transform: 'translate(-50%, -50%)',
          fontFamily: `'${font}', cursive`,
          fontSize: `${size}px`,
          color,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        {d.memberName}
      </div>
    </div>
  )
}

function resolveTemplate(data: CertificateData, scaleFactor?: number) {
  if (data.template === 'modern') return <ModernTemplate d={data} />
  if (data.template === 'elegant') return <ElegantTemplate d={data} />
  if (data.template === 'custom') return <CustomTemplate d={data} scaleFactor={scaleFactor} />
  return <ClassicTemplate d={data} />
}

export function CertificateRenderer({ data, previewWidth }: { data: CertificateData; previewWidth?: number }) {
  const scale = previewWidth ? previewWidth / 1122 : undefined
  return (
    <div className="relative w-full" style={{ paddingBottom: '70.7%' }}>
      <div className="absolute inset-0 overflow-hidden">
        {resolveTemplate(data, scale)}
      </div>
    </div>
  )
}

export function CertificateRendererPrint({ data }: { data: CertificateData }) {
  return (
    <div className="relative overflow-hidden" style={{ width: '297mm', height: '210mm' }}>
      {resolveTemplate(data, 1)}
    </div>
  )
}
