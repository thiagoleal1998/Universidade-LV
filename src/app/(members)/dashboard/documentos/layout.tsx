import { FileText } from 'lucide-react'
import { SubNav } from '@/components/members/sub-nav'

export default function DocumentosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Documentos</h1>
          <p className="text-sm text-muted-foreground">Certificados e anotações das suas aulas.</p>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border mb-6">
        <SubNav />
      </div>

      {children}
    </div>
  )
}
