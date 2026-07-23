'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmailTemplate, type EmailTemplate } from '@/app/actions/email-templates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { toast } from 'sonner'
import { Mail, Pencil, X, Save } from 'lucide-react'

// Os e-mails de aluno (boas-vindas, aprovação, recusa, comunicado, conteúdo
// publicado, treinamento novo) migraram pra RD Station (v1.86.0, ver
// src/lib/rdstation.ts) — o texto deles agora é editado nas Automações da
// própria RD Station, não mais aqui. Só os 2 e-mails internos pro admin
// continuam no Resend/email_templates.
const TEMPLATE_META: Record<string, { label: string; description: string; vars: string[] }> = {
  admin_new_member_pending: {
    label: 'Novo cadastro pendente (admin)',
    description: 'Enviado para o e-mail do admin quando alguém se cadastra.',
    vars: ['nome'],
  },
  admin_new_feedback: {
    label: 'Novo chamado de feedback (admin)',
    description: 'Enviado para o e-mail do admin quando um membro abre um chamado.',
    vars: ['nome', 'email', 'tipo', 'titulo', 'resumo'],
  },
}

const DISPLAY_ORDER = [
  'admin_new_member_pending',
  'admin_new_feedback',
]

function TemplateForm({ template, onDone }: { template: EmailTemplate; onDone: () => void }) {
  const router = useRouter()
  const [subject, setSubject] = useState(template.subject)
  const [bodyHtml, setBodyHtml] = useState(template.body_html)
  const [isSaving, startSave] = useTransition()
  const meta = TEMPLATE_META[template.type]

  function handleSave() {
    startSave(async () => {
      const r = await updateEmailTemplate(template.type, subject, bodyHtml)
      if (r?.error) toast.error(r.error)
      else {
        toast.success('Template salvo!')
        onDone()
        router.refresh()
      }
    })
  }

  return (
    <div className="bg-muted/40 border border-dashed rounded-lg p-4 space-y-3">
      <div>
        <Label className="text-xs">Assunto</Label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onKeyDown={(e) => {
            // Este editor vive dentro do <form> gigante de Configurações —
            // sem isso, Enter aqui dispara o submit do form inteiro por engano.
            if (e.key === 'Enter') e.preventDefault()
          }}
          placeholder="Assunto do e-mail"
          className="text-sm mt-1.5"
        />
      </div>
      <div>
        <Label className="text-xs">Corpo</Label>
        <div className="mt-1.5">
          <RichTextEditor content={bodyHtml} onChange={setBodyHtml} />
        </div>
      </div>
      {meta && meta.vars.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Variáveis disponíveis (substituídas automaticamente ao enviar):</p>
          <div className="flex flex-wrap gap-1.5">
            {meta.vars.map((v) => (
              <Badge key={v} variant="outline" className="text-[10px] font-mono">
                {`{{${v}}}`}
              </Badge>
            ))}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <Button type="button" size="sm" onClick={handleSave} disabled={isSaving || !subject.trim()} className="gap-1.5">
          {isSaving ? <Spinner className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} className="gap-1.5">
          <X className="w-3.5 h-3.5" />
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function EmailTemplatesManager({ templates }: { templates: EmailTemplate[] }) {
  const [editingType, setEditingType] = useState<string | null>(null)
  const byType = new Map(templates.map((t) => [t.type, t]))
  const ordered = DISPLAY_ORDER.map((type) => byType.get(type)).filter((t): t is EmailTemplate => !!t)

  return (
    <div className="bg-card border rounded-lg p-5">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">Templates de E-mail</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Edite o assunto e o corpo dos e-mails automáticos enviados pela plataforma.
      </p>

      <div className="space-y-2">
        {ordered.map((tpl) => {
          const meta = TEMPLATE_META[tpl.type]
          return editingType === tpl.type ? (
            <TemplateForm key={tpl.type} template={tpl} onDone={() => setEditingType(null)} />
          ) : (
            <div key={tpl.type} className="flex items-center justify-between gap-3 border rounded-lg px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{meta?.label ?? tpl.type}</p>
                <p className="text-xs text-muted-foreground truncate">{meta?.description}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setEditingType(tpl.type)} title="Editar template" className="shrink-0">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
