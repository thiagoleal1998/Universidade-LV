import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { Trophy, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleCompletionBannerProps {
  hasCertificate: boolean
}

export function ModuleCompletionBanner({ hasCertificate }: ModuleCompletionBannerProps) {
  return (
    <div className="mt-8 rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 dark:border-amber-700 p-6 text-center">
      <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-3" />
      <h3 className="text-lg font-bold text-foreground mb-1">Módulo concluído!</h3>
      {hasCertificate ? (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Seu certificado está disponível para impressão.
          </p>
          <Link
            href="/dashboard/documentos"
            className={cn(buttonVariants({ variant: 'default' }), 'gap-2')}
          >
            <FileText className="w-4 h-4" />
            Ver meu certificado
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-4">
            Parabéns! Aguarde a emissão do seu certificado pelo administrador.
          </p>
          <Link
            href="/dashboard/documentos"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 border-amber-300')}
          >
            <FileText className="w-4 h-4" />
            Meus documentos
          </Link>
        </>
      )}
    </div>
  )
}
