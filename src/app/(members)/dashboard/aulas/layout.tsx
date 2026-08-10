// z-[10000] (acima do z-[9999] do sino de notificações, `notification-bell.tsx`)
// — bug real (relatado pelo usuário): a sidebar do dashboard (com o sino)
// continua montada por baixo dessa tela de leitura em tela cheia (layouts do
// Next.js persistem entre navegações dentro da mesma árvore), só escondida
// visualmente. O sino ganhou `z-[9999]` de propósito (CLV-0051, pra ficar
// clicável por cima de qualquer Dialog aberto na MESMA tela), mas isso
// também o deixava por cima deste overlay (que só tinha `z-50`) — no
// celular, o botão do sino (e o painel, se já estivesse aberto antes de
// entrar na aula) ficava sobreposto/ocupando o mesmo espaço dos próprios
// controles do cabeçalho da aula, interceptando cliques que deveriam ir pro
// botão de tema/painel da aula. Com um z-index maior aqui, este overlay
// volta a cobrir de verdade tudo que vem da sidebar por baixo, inclusive o
// sino e qualquer painel de notificação que tenha ficado aberto.
export default function StudyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[10000] bg-background overflow-auto">
      {children}
    </div>
  )
}
