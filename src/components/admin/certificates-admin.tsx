'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { issueCertificate, revokeCertificate, approveCertificate, updateCertificateSettings } from '@/app/actions/certificates'
import { CertificatePositionEditor } from '@/components/admin/certificate-position-editor'
import { CertificateRenderer } from '@/components/certificate-renderer'
import type { CertificateData } from '@/components/certificate-renderer'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { toast } from 'sonner'
import {
  Award, Check, Trash2, ChevronDown, ChevronRight,
  ImageIcon, Eye, SendHorizonal, ShieldCheck, Printer,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const TEMPLATES = [
  {
    id: 'classic',
    label: 'Clássico',
    description: 'Borda dourada, estilo tradicional',
    preview: (
      <div className="w-full h-20 rounded border-4 border-double border-amber-400 bg-amber-50 flex items-center justify-center">
        <span className="text-xs font-serif text-amber-800 tracking-widest uppercase">Certificado</span>
      </div>
    ),
  },
  {
    id: 'modern',
    label: 'Moderno',
    description: 'Clean, cor primária, minimalista',
    preview: (
      <div className="w-full h-20 rounded border border-gray-200 bg-white overflow-hidden flex flex-col">
        <div className="h-2 bg-blue-600 w-full" />
        <div className="flex-1 flex items-center px-3 gap-2">
          <div className="w-5 h-5 rounded bg-blue-100 shrink-0" />
          <div>
            <div className="h-2 w-16 bg-blue-600 rounded mb-1" />
            <div className="h-1.5 w-10 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'elegant',
    label: 'Elegante',
    description: 'Fundo escuro, destaque dourado',
    preview: (
      <div className="w-full h-20 rounded bg-slate-900 flex items-center justify-center relative border border-slate-700">
        <div className="absolute top-1.5 left-1.5 w-4 h-4 border-t border-l border-amber-400" />
        <div className="absolute top-1.5 right-1.5 w-4 h-4 border-t border-r border-amber-400" />
        <div className="absolute bottom-1.5 left-1.5 w-4 h-4 border-b border-l border-amber-400" />
        <div className="absolute bottom-1.5 right-1.5 w-4 h-4 border-b border-r border-amber-400" />
        <span className="text-xs text-amber-300 tracking-widest uppercase font-serif">Certificado</span>
      </div>
    ),
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Suba sua própria imagem',
    preview: (
      <div className="w-full h-20 rounded border-2 border-dashed border-primary/40 bg-primary/5 flex flex-col items-center justify-center gap-1.5">
        <ImageIcon className="w-5 h-5 text-primary/60" />
        <span className="text-xs text-primary/70 font-medium">Modelo próprio</span>
      </div>
    ),
  },
]

type CompletionEntry = {
  userId: string
  userName: string
  certificateId: string | null
  certificateStatus: string | null
  issuedAt: string | null
}

type ModuleEntry = {
  id: string
  title: string
  completions: CompletionEntry[]
}

type CertSettings = {
  template: string
  siteName: string
  logoUrl: string
  signatoryName: string
  signatoryRole: string
  customUrl: string
  nameX: string
  nameY: string
  nameFont: string
  nameSize: string
  nameColor: string
}

interface CertificatesAdminProps {
  modules: ModuleEntry[]
  currentTemplate: string
  signatoryName: string
  signatoryRole: string
  customUrl: string
  nameX: string
  nameY: string
  nameFont: string
  nameSize: string
  nameColor: string
  siteName: string
  logoUrl: string
  canManageSettings?: boolean
}

// ---- Live preview section ----

function CertificatePreview({ data }: { data: CertificateData }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Pré-visualização</Label>
        <span className="text-xs text-muted-foreground">Dados de exemplo — atualiza conforme você edita</span>
      </div>
      <div className="rounded-xl overflow-hidden border border-border shadow-sm">
        <CertificateRenderer data={data} />
      </div>
    </div>
  )
}

// ---- Per-member preview dialog ----

function PreviewDialog({ entry, mod, settings }: { entry: CompletionEntry; mod: ModuleEntry; settings: CertSettings }) {
  const certData: CertificateData = {
    memberName: entry.userName,
    moduleName: mod.title,
    siteName: settings.siteName,
    logoUrl: settings.logoUrl,
    issuedAt: new Date().toISOString(),
    signatoryName: settings.signatoryName,
    signatoryRole: settings.signatoryRole,
    template: settings.template,
    customTemplateUrl: settings.customUrl,
    nameX: settings.nameX,
    nameY: settings.nameY,
    nameFont: settings.nameFont,
    nameSize: settings.nameSize,
    nameColor: settings.nameColor,
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" />}>
        <Eye className="w-3 h-3" />
        Prévia
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base">Prévia — {entry.userName}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 rounded-lg overflow-hidden border border-border">
          <CertificateRenderer data={certData} />
        </div>
        <p className="text-xs text-muted-foreground text-center mt-1">
          Nenhum certificado foi emitido — apenas prévia.
        </p>
      </DialogContent>
    </Dialog>
  )
}

// ---- Module row ----

function ModuleRow({ mod, settings }: { mod: ModuleEntry; settings: CertSettings }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const approved = mod.completions.filter((c) => c.certificateStatus === 'approved').length
  const internal = mod.completions.filter((c) => c.certificateStatus === 'internal').length

  function handleIssueInternal(entry: CompletionEntry) {
    startTransition(async () => {
      const result = await issueCertificate(entry.userId, mod.id, settings.template, 'internal')
      if (result?.error) toast.error(result.error)
      else toast.success(`Emissão interna criada para ${entry.userName}`)
    })
  }

  function handleApprove(entry: CompletionEntry) {
    startTransition(async () => {
      const result = await approveCertificate(entry.certificateId!)
      if (result?.error) toast.error(result.error)
      else toast.success(`Certificado enviado para ${entry.userName}!`)
    })
  }

  function handleRevoke(entry: CompletionEntry) {
    startTransition(async () => {
      const result = await revokeCertificate(entry.certificateId!)
      if (result?.error) toast.error(result.error)
      else toast.success('Certificado removido.')
    })
  }

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/40 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {open
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="font-medium text-foreground">{mod.title}</span>
          <Badge variant="secondary" className="text-xs">{mod.completions.length} concluíram</Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {internal > 0 && (
            <span className="flex items-center gap-1 text-amber-600">
              <ShieldCheck className="w-3 h-3" />{internal} interno{internal !== 1 ? 's' : ''}
            </span>
          )}
          {approved > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <Check className="w-3 h-3" />{approved} aprovado{approved !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-border divide-y divide-border">
          {mod.completions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum membro concluiu este módulo ainda.
            </p>
          )}
          {mod.completions.map((entry) => (
            <div key={entry.userId} className="flex items-center justify-between px-5 py-3 gap-4">
              <div className="flex items-center gap-2.5 min-w-0">
                {entry.certificateStatus === 'approved' ? (
                  <Check className="w-4 h-4 text-green-500 shrink-0" />
                ) : entry.certificateStatus === 'internal' ? (
                  <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <Award className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate leading-tight">{entry.userName}</p>
                  {entry.certificateStatus === 'internal' && (
                    <p className="text-[10px] text-amber-600 leading-tight">Emissão interna — aguardando aprovação</p>
                  )}
                  {entry.certificateStatus === 'approved' && entry.issuedAt && (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Aprovado em {new Date(entry.issuedAt).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {!entry.certificateId && (
                  <>
                    <PreviewDialog entry={entry} mod={mod} settings={settings} />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1.5"
                      disabled={pending}
                      onClick={() => handleIssueInternal(entry)}
                    >
                      {pending ? <Spinner className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                      Emissão Interna
                    </Button>
                  </>
                )}

                {entry.certificateStatus === 'internal' && (
                  <>
                    <PreviewDialog entry={entry} mod={mod} settings={settings} />
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                      disabled={pending}
                      onClick={() => handleApprove(entry)}
                    >
                      {pending ? <Spinner className="w-3 h-3" /> : <SendHorizonal className="w-3 h-3" />}
                      Aprovar e Enviar
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      disabled={pending}
                      onClick={() => handleRevoke(entry)}
                      title="Cancelar emissão"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}

                {entry.certificateStatus === 'approved' && (
                  <>
                    <Link
                      href={`/certificado/${entry.certificateId}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs border border-border bg-card hover:bg-muted transition-colors text-foreground"
                    >
                      <Printer className="w-3 h-3" />
                      Imprimir
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      disabled={pending}
                      onClick={() => handleRevoke(entry)}
                      title="Revogar certificado"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Main component ----

export function CertificatesAdmin({
  modules,
  currentTemplate,
  signatoryName,
  signatoryRole,
  customUrl,
  nameX,
  nameY,
  nameFont,
  nameSize,
  nameColor,
  siteName,
  logoUrl,
  canManageSettings = true,
}: CertificatesAdminProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(currentTemplate)
  const [signatoryNameValue, setSignatoryNameValue] = useState(signatoryName)
  const [signatoryRoleValue, setSignatoryRoleValue] = useState(signatoryRole)
  const [isSaving, startSave] = useTransition()

  const settings: CertSettings = {
    template: selectedTemplate,
    siteName,
    logoUrl,
    signatoryName: signatoryNameValue,
    signatoryRole: signatoryRoleValue,
    customUrl,
    nameX,
    nameY,
    nameFont,
    nameSize,
    nameColor,
  }

  const previewData: CertificateData = {
    memberName: 'Nome do Membro',
    moduleName: 'Exemplo de Módulo',
    siteName,
    logoUrl,
    issuedAt: new Date().toISOString(),
    signatoryName: signatoryNameValue,
    signatoryRole: signatoryRoleValue,
    template: selectedTemplate,
    customTemplateUrl: customUrl,
    nameX,
    nameY,
    nameFont,
    nameSize,
    nameColor,
  }

  function handleSaveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('certificate_template', selectedTemplate)
    startSave(async () => {
      const result = await updateCertificateSettings(formData)
      if (result && 'error' in result) toast.error(result.error)
      else toast.success('Configurações salvas!')
    })
  }

  return (
    <div className="space-y-10">
      {/* Template picker + live preview — configuração global, admin-only */}
      {canManageSettings && (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-foreground mb-1">Modelo do Certificado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Escolha o design e ajuste as configurações. A pré-visualização atualiza em tempo real.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Template cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedTemplate(t.id)}
                className={cn(
                  'text-left rounded-xl border-2 p-3 transition-all',
                  selectedTemplate === t.id
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40'
                )}
              >
                {t.preview}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{t.label}</span>
                    {selectedTemplate === t.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Signatory fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="certificate_signatory_name">Nome do signatário</Label>
              <Input
                id="certificate_signatory_name"
                name="certificate_signatory_name"
                value={signatoryNameValue}
                onChange={(e) => setSignatoryNameValue(e.target.value)}
                placeholder="Ex: João Silva"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="certificate_signatory_role">Cargo do signatário</Label>
              <Input
                id="certificate_signatory_role"
                name="certificate_signatory_role"
                value={signatoryRoleValue}
                onChange={(e) => setSignatoryRoleValue(e.target.value)}
                placeholder="Ex: Diretor Acadêmico"
              />
            </div>
          </div>

          <Button type="submit" disabled={isSaving} className="gap-2">
            {isSaving ? <><Spinner className="w-4 h-4" /> Salvando...</> : 'Salvar configurações'}
          </Button>
        </form>

        {/* Live certificate preview */}
        <CertificatePreview data={previewData} />

        {/* Custom template position editor */}
        {selectedTemplate === 'custom' && (
          <CertificatePositionEditor
            currentUrl={customUrl}
            nameX={nameX}
            nameY={nameY}
            nameFont={nameFont}
            nameSize={nameSize}
            nameColor={nameColor}
          />
        )}
      </div>
      )}

      {/* Issuance workflow */}
      <div>
        <h3 className="font-semibold text-foreground mb-1">Emissão de Certificados</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Fluxo: <span className="font-medium text-foreground">Prévia</span> →{' '}
          <span className="font-medium text-amber-600">Emissão Interna</span> →{' '}
          <span className="font-medium text-green-600">Aprovar e Enviar</span> para o membro.
        </p>

        <div className="flex flex-wrap gap-4 mb-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Pendente</span>
          <span className="flex items-center gap-1.5 text-amber-600"><ShieldCheck className="w-3.5 h-3.5" /> Emissão Interna (somente admin)</span>
          <span className="flex items-center gap-1.5 text-green-600"><Check className="w-3.5 h-3.5" /> Aprovado (membro recebe)</span>
        </div>

        <div className="space-y-3">
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum módulo com conclusões ainda.
            </p>
          ) : (
            modules.map((mod) => (
              <ModuleRow key={mod.id} mod={mod} settings={settings} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
