'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ExternalLink, Copy, Check, Image as ImageIcon, Link2, Mail, FileText } from 'lucide-react'
import { toast } from 'sonner'

type Section = { key: string; label: string; type: string }
type MarketingItem = {
  id: string
  category: string
  title: string
  description: string
  content: string
  url: string
}

const CATEGORY_ICON: Record<string, React.ElementType> = {
  visual: ImageIcon,
  link:   Link2,
  email:  Mail,
  script: FileText,
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copiado!')
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-muted"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

export function MemberMarketingView({ sections, items }: { sections: Section[]; items: MarketingItem[] }) {
  const [activeKey, setActiveKey] = useState(sections[0]?.key ?? '')

  const activeSection = sections.find((s) => s.key === activeKey)
  const activeItems = items.filter((i) => i.category === activeKey)

  if (sections.length === 0) {
    return (
      <div className="text-center py-16 bg-card border rounded-xl">
        <p className="text-muted-foreground">Nenhum material disponível ainda.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {sections.map((s) => {
          const Icon = CATEGORY_ICON[s.type] ?? FileText
          return (
            <button
              key={s.key}
              onClick={() => setActiveKey(s.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px shrink-0',
                activeKey === s.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="w-4 h-4" />
              {s.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      {activeItems.length === 0 ? (
        <div className="text-center py-16 bg-card border rounded-xl">
          <p className="text-muted-foreground">Nenhum material nesta categoria ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeSection?.type === 'visual' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-card border rounded-xl overflow-hidden group">
                  {item.url && (
                    <div className="aspect-video bg-muted overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-1">{item.description}</p>}
                    {item.url && (
                      <a
                        href={item.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Baixar / Abrir
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeSection?.type === 'link' && (
            <div className="space-y-3">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-card border rounded-xl p-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Link2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                  </div>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-primary hover:underline shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Abrir
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {(activeSection?.type === 'email' || activeSection?.type === 'text') && (
            <div className="space-y-4">
              {activeItems.map((item) => (
                <div key={item.id} className="bg-card border rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                    <p className="font-medium text-foreground text-sm">{item.title}</p>
                    {item.content && <CopyButton text={item.content} />}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground px-5 py-2 border-b border-border/50">{item.description}</p>
                  )}
                  {item.content && (
                    <pre className="text-sm text-foreground px-5 py-4 whitespace-pre-wrap font-sans leading-relaxed">
                      {item.content}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
