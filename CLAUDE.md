@AGENTS.md

# Git — Atualização Automática

Após concluir qualquer conjunto de mudanças neste projeto, **sempre** faça commit e push para o repositório remoto:

```
git add <arquivos modificados>
git commit -m "<mensagem descritiva>"
git push origin main
```

- Use mensagens de commit em português, descritivas do que foi feito
- Adicione apenas os arquivos modificados (nunca `git add -A` sem revisar)
- Nunca force-push em `main`
- Sempre faça push ao final de cada tarefa concluída

# Versão do Sistema

A versão fica em `src/lib/version.ts` (constante `APP_VERSION`) e exibida no rodapé do sidebar.

**Regra:** a cada conjunto de mudanças commitado, incremente a versão seguindo semver:
- `patch` (x.x.**N**) — correções de bugs, ajustes visuais, pequenas melhorias
- `minor` (x.**N**.0) — funcionalidades novas ou mudanças relevantes de UX
- `major` (**N**.0.0) — mudanças arquiteturais grandes (raramente)

Atualize `src/lib/version.ts` junto com os demais arquivos no mesmo commit.

# Projeto — Universidade LV

**Criador:** Thiago Leal da Silva

Plataforma de ensino para agentes de viagem. Next.js App Router + Supabase.

## Stack
- **Frontend**: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons, Sonner (toasts)
- **Backend**: Supabase (Postgres + Storage + Auth)
- **Tabelas principais**: `profiles`, `training_items`, `training_materials`, `notifications`, `announcements`, `site_settings`, `lessons`, `modules`, `courses`

## Supabase
- `createClient()` — cliente com sessão do usuário (respeita RLS)
- `createAdminClient()` — usa `SUPABASE_SERVICE_ROLE_KEY`, bypassa RLS; use para operações admin
- Projeto ID: definido em `NEXT_PUBLIC_SUPABASE_URL` (ver `.env.local`)
- RLS `profiles`: usuário lê/edita apenas o próprio; admins leem todos (`profiles_select_admin`)
- Notificações: INSERT via `adminClient` (sem política de INSERT — service role bypassa RLS)
- **Relações N→1** (ex.: `tags(name)`, `courses(name)`, `lessons(title)` em joins): o PostgREST retorna **objeto** em runtime, mas o client sem tipos gerados infere **array**. Nunca acesse com `.map()`/`[0]` direto — use `toOne()` de `src/lib/supabase/relations.ts`, que normaliza as duas formas. (Regressão real na v1.50.1: Marketing quebrou com `t.tags.map is not a function` só para usuários com tags.)
- Triggers em `profiles` disparados via auth (GoTrue) rodam com `search_path` restrito — sempre qualifique objetos com `public.` dentro de funções de trigger (ver migração 030).
- **RLS bloqueia joins embutidos para linhas de outro dono, silenciosamente** (sem erro, só vem `null`/vazio): se a query do MEMBRO (client de sessão) faz embed tipo `profiles!fk(full_name)` para um `id` que não é o dele mesmo (ex.: nome do admin responsável por um chamado), a RLS de `profiles` (só lê o próprio perfil) barra o join e o campo volta vazio — mesmo a linha principal sendo do próprio membro. Real em `getMyFeedbackReports` (`src/app/actions/feedback.ts`): resolvido trocando para `adminClient` com filtro explícito `.eq('user_id', user.id)` (a checagem de posse fica no filtro, não na RLS).
- Pacotes `@tiptap/*` precisam ficar todos na MESMA versão exata (ver `package.json`) — as extensões fixam peer dependency `@tiptap/core` na versão exata, não em range; um caret (`^`) num único pacote causa conflito de peer dependency no `npm install` assim que o tiptap publica um patch novo.
- `<Select>` (`src/components/ui/select.tsx`) é baseado em `@base-ui/react/select`, não Radix. **`<SelectValue />` sozinho renderiza o valor bruto**, não o label do `<SelectItem>` selecionado — ele não escaneia os itens renderizados. Precisa de `<SelectValue>{(v) => label[v]}</SelectValue>` (função de mapeamento) ou do prop `items` no `<Select>` raiz. Sem isso, o trigger mostra o `value` cru (ex.: um UUID) em vez do texto — bug real visto no seletor de "Responsável" em `feedback-panel.tsx`.

## Papéis e autorização (admin / collaborator / member)
- `profiles.role` aceita `'admin' | 'member' | 'collaborator'` (migração `036`). **Colaborador** = pessoa interna que cria/edita conteúdo apenas da sua área, e estuda como membro comum no `/dashboard` (sem preview de rascunho).
- **Áreas de colaborador** são configuráveis pelo admin (tabela `collaborator_areas`: `name` + `capabilities text[]`), geridas em Admin → Membros → "Áreas de Colaborador" (`collaborator-areas-manager.tsx`). Cada colaborador pertence a UMA área (`profiles.collaborator_area_id`). **Decisão: NÃO reutilizar `tags`** — tags têm semântica de visibilidade de aluno; misturar criaria risco de apagar uma "tag-área" sem perceber que dava poder de escrita.
- **Capacidades** (enum fixo em `src/lib/capabilities.ts`): `courses` (cursos+módulos+aulas), `trainings`, `marketing`, `comercial`, `aereo`. Premiação/PodViajar/Corrida de Vendas gravam settings globais → admin-only. `NAV_CAPABILITIES` mapeia href→capacidades para filtrar a sidebar.
- **Dono do conteúdo**: `owner_area_id` (nullable, NULL = global/admin) em `courses`, `training_items`, `marketing_items`. `modules`/`lessons` herdam via `course_id`. A área é dona (qualquer colaborador da mesma área edita); colaborador NÃO vê conteúdo de outras áreas nem global nas telas admin. **Reorder global (cursos/módulos/treinamentos) é admin-only** — a listagem do colaborador é parcial e reordenar um subconjunto bagunçaria os índices; reorder de aulas (escopado ao módulo) continua liberado.
- **Camadas de autorização** (`src/lib/authz.ts`): `getAdminContext()` monta `{role, areaId, capabilities}`; guards de action (`requireAdmin`, `requireCapability`, `requireContentAccess`, `requireCourseAccess`→`requireModuleAccess`→`requireLessonAccess` sobem a cadeia de posse) retornam `{error}`; guards de página (`requirePageCapability`, `requireAdminPage`, `requireCoursePage`/`requireModulePage`/`requireLessonPage`) fazem `redirect`. **As policies RLS continuam admin-only de propósito** — a mutação do colaborador passa pelo guard e usa `adminClient`; se alguma action esquecer o guard/adminClient, a RLS bloqueia silenciosamente (0 linhas, sem erro) — mesmo gotcha da nota de feedback acima.
- **TODA server action de mutação tem guard explícito no topo** (padrão `const ctx = await requireX(); if ('error' in ctx) return { error: ctx.error }`): conteúdo usa capacidade+posse; `members/tags/settings/marketing-settings/announcements/seo/faq` usam `requireAdmin()` (antes não tinham NENHUMA checagem — brecha fechada na v1.63.0). Ao criar action nova, sempre incluir guard — o gate do layout não protege actions.
- Entrada no `/admin`: `proxy.ts` e `admin/layout.tsx` aceitam admin e collaborator ativo; `admin/page.tsx` (dashboard de métricas) redireciona colaborador para a primeira tela permitida. Telas de detalhe buscam dados via `adminClient` APÓS o guard de posse (client de sessão esconderia rascunhos do próprio colaborador).
- `notifyAllMembers` e o `notifyMembers` de training incluem `role IN ('member','collaborator')` — colaboradores também estudam e recebem avisos.
- Cadastro: admin promove membro a colaborador no `EditMemberDialog` (radio + select de área obrigatório). `approveMember` intocado (aprova como member; promover é passo separado).

## Conteúdo rico gerado por membros (não só admin)
- `RichTextEditor` mora em `src/components/ui/rich-text-editor.tsx` (Tiptap) — usado tanto por admins (`lesson-editor.tsx`, `corrida-vendas-manager.tsx`) quanto por membros (`feedback-ticket-form.tsx`).
- Sempre que HTML gerado por MEMBRO for salvo para ser renderizado depois (`dangerouslySetInnerHTML`) por outro usuário (ex: admin vendo um chamado de feedback), sanitize no server action antes de gravar — usar `isomorphic-dompurify` com allowlist explícita (ver `sanitizeRichText` em `src/app/actions/feedback.ts`). Todo `dangerouslySetInnerHTML` anterior no projeto (anúncios, aulas, corridas) só recebe HTML gerado por admins confiáveis — não sanitizado, e deve continuar assim (não é boundary de confiança). Feedback é o primeiro caso de conteúdo rico membro→admin.

## Notificações
- Tabela `notifications`: `id, user_id, type, title, body, link, read_at, created_at`
- Após inserir notificações: chamar `revalidatePath('/dashboard', 'layout')` para invalidar cache do unread count
- Tipos usados (destinatário entre parênteses): `new_training`/`training_replay`/`training_live_expired` (membros do curso), `announcement` (todos os membros), `lesson_published`/`module_published` (membros com acesso ao curso), `task_submitted` (admins), `task_graded` (membro dono da submissão), `task_opened`/`task_closing_soon`/`task_closing_tomorrow` (membros matriculados, via cron `src/app/api/cron/task-reminders/route.ts`), `community_new_post`/`community_new_reply` (admins), `community_reply` (autor do post), `new_feedback` (admins, ao abrir chamado), `new_member_pending` (admins, cadastro aguardando aprovação), `feedback_update` (membro dono do chamado, quando admin muda status ou responde em `src/app/actions/feedback.ts`).
- **Som/toast em tempo real é escopo limitado, não geral**: nem todo tipo acima toca som — só os que têm um componente cliente dedicado assinando Realtime. Hoje existem dois: `src/components/admin/admin-notification-sound.tsx` (admin, tipos `new_feedback`/`new_member_pending`, montado uma vez em `src/app/(admin)/admin/layout.tsx`) e `src/components/members/feedback-notification-sound.tsx` (membro, só tipo `feedback_update`, montado em `src/app/(members)/dashboard/layout.tsx` **só quando `isTester`**, já que só testador abre chamado). O sino do membro (`notification-bell.tsx`) fora desses tipos é só visual — busca ao clicar, sem realtime/som. Ao adicionar um novo tipo que mereça som, decidir explicitamente se cria/estende um desses componentes; não veio de graça por estar na tabela `notifications`.
- **Realtime + polling (híbrido)**: `notifications` está na publication `supabase_realtime` (migração `033`). **Realtime sozinho não é confiável** (confirmado empiricamente: entrega intermitente do evento `postgres_changes`, mesmo com a tabela corretamente na publication e RLS ok) — por isso os dois componentes acima também fazem polling a cada 15s via `getRecentSoundNotifications` (`src/app/actions/notifications.ts`, genérico — recebe a lista de tipos que interessa a cada chamador) como garantia, deduplicando por `id` num `Set` em ref para não tocar duas vezes se ambas as vias pegarem o mesmo evento. Se precisar de realtime em outra tabela, mesma receita de publication: `ALTER PUBLICATION supabase_realtime ADD TABLE x` (idempotente com `DO $$ ... EXCEPTION WHEN duplicate_object`) — mas considere se vale a pena também ter um fallback de polling.

## Convenções
- Server actions ficam em `src/app/actions/`
- Componentes admin em `src/components/admin/`
- Componentes UI reutilizáveis em `src/components/ui/`
- `settings` são pares chave-valor na tabela `site_settings`; tipo e defaults em `src/lib/settings.ts`
- Nav do admin é duplicado em dois lugares que precisam ficar em sincronia: `NAV_ITEMS` em `src/components/admin/admin-sidebar.tsx` (render real, com ícone) e `ALL_NAV_ITEMS` em `src/components/admin/settings-form.tsx` (aba "Menu Admin", reordenável via `nav_order`). Ao adicionar página admin nova, adicionar nos dois + no default de `nav_order` em `src/lib/settings.ts`.
- **Perfil (admin e membro) é a MESMA tela**: `src/app/(admin)/admin/perfil/page.tsx` e `src/app/(members)/dashboard/perfil/page.tsx` renderizam o mesmo `<ProfileTabs>` (`src/components/members/profile-tabs.tsx`), cuja aba "Meu Perfil" usa `ProfileFormCompact` (`src/components/members/profile-form-compact.tsx`) — único lugar a editar para mudar campos de perfil de qualquer um dos dois papéis. Campos hoje: nome, email (read-only), avatar, empresa (`company`), cargo (`job_title`), LinkedIn (`linkedin_url`), salvos via `updateProfile` em `src/app/actions/profile.ts`. Existe também `src/components/members/profile-form.tsx`, mas é código morto (nenhuma página importa) — não editar por engano achando que é o formulário real.

## Rollout faseado (em andamento, deadline 31/08/2026)
- Plano completo em `C:\Users\thiago.leal\.claude\plans\recursive-painting-wave.md`. Fase 1 (Marketing/T.I.) em execução.
- Testadores são marcados com a tag **"Beta"** (criada em Admin → Membros → Gerenciar tags, atribuída via `assignMemberTags` já existente).
- Feedback virou um "chamado" completo, não mais popup: item "Feedback" na sidebar do membro (`src/components/members/member-feedback-widget.tsx`, só aparece com a tag Beta — checado em `src/app/(members)/dashboard/layout.tsx` e de novo, server-side, na própria página `src/app/(members)/dashboard/feedback/page.tsx` — bloqueia acesso direto por URL) leva para uma página com formulário completo (`feedback-ticket-form.tsx`: título, tipo, editor rico com imagem inline, link, anexos de foto) + lista "Minhas solicitações" (`my-feedback-list.tsx`).
- Dados em `feedback_reports` (migração `031`) + `title`/`link_url` (migração `032`) + `feedback_attachments` (tabela filha, bucket `feedback-attachments`). Visível em Admin → Feedback (`src/app/(admin)/admin/feedback/`).
- **Timeline, responsável e status de 3 estados (migração `034`)**: `feedback_reports.status` agora é `'open' | 'in_progress' | 'resolved'` e tem `assigned_to` (FK para `profiles`, admin responsável). Cada evento (criação, atribuição, mudança de status, resposta) vira uma linha em `feedback_events`, com `actor_name`/`assigned_name` **denormalizados como texto** no momento do evento (não joins) — evita de propósito o gotcha de N→1 acima e mantém o histórico estável mesmo se o admin for renomeado/removido depois. Não existe mais `admin_note` (campo único que se sobrescrevia) — virou `addFeedbackNote`, que só insere um evento `note_added`, nunca edita/apaga os anteriores. `FeedbackTimeline` (`src/components/ui/feedback-timeline.tsx`) e `ImageLightbox` (`src/components/ui/image-lightbox.tsx`, visualizador inline de anexos sem abrir nova aba) são compartilhados entre o painel admin (`feedback-panel.tsx`) e a lista do membro (`my-feedback-list.tsx`) — membro vê a timeline completa, não só a última resposta.
- No painel admin, o card expandido de um chamado fica visível mesmo se o status mudar para fora da aba filtrada (`r.id === openId` no filtro de `feedback-panel.tsx`) — sem isso, o card some da tela no meio da edição assim que o `router.refresh()` do `updateFeedbackStatus` chega.
- **`addFeedbackNote` (`src/app/actions/feedback.ts`) é bidirecional**: tanto admin quanto o membro dono do chamado podem chamá-la para responder (mesmo botão "Enviar resposta" nos dois lados, usando `RichTextEditor` para negrito/itálico/lista/etc — texto sanitizado com o mesmo `SANITIZE_CONFIG` da mensagem original, já que agora é conteúdo de duas origens diferentes renderizado pro outro lado). Autorização: admin sempre pode; membro só no próprio chamado (`actor.id === report.user_id`), checado no server (não só escondido na UI). Notificação vai para "quem não escreveu": admin responde → avisa o membro; membro responde → avisa o `assigned_to` se houver, senão todos os admins (`notifyAllAdmins`). `assignFeedback`/`updateFeedbackStatus` são admin-only via `requireAdmin()` — antes dessa checagem, a RLS bloqueava o UPDATE de qualquer não-admin silenciosamente (0 linhas, sem erro), mas o código seguia inserindo evento/notificação como se tivesse funcionado.
- `admin-notification-sound.tsx` também tocava som só para `new_feedback`/`new_member_pending` — agora inclui `feedback_update` também, pois esse tipo passou a cobrir "membro respondeu"/"chamado atribuído a mim", que o admin quer ouvir na hora.

## Atualização deste arquivo
Mantenha este CLAUDE.md atualizado com decisões arquiteturais, convenções novas ou contexto relevante descoberto durante o desenvolvimento. Não documente o óbvio — apenas o que um novo Claude não conseguiria derivar lendo o código.
