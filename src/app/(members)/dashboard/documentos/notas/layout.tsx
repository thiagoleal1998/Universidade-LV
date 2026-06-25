import { NotasNav } from '@/components/members/notas-nav'

export default function NotasLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-foreground">Minhas Notas</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe suas tarefas enviadas e notas recebidas.
        </p>
      </div>
      <NotasNav />
      {children}
    </div>
  )
}
