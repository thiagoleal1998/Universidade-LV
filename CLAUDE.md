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
- Pacotes `@tiptap/*` precisam ficar todos na MESMA versão exata (ver `package.json`) — as extensões fixam peer dependency `@tiptap/core` na versão exata, não em range; um caret (`^`) num único pacote causa conflito de peer dependency no `npm install` assim que o tiptap publica um patch novo.

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

## Rollout faseado (em andamento, deadline 31/08/2026)
- Plano completo em `C:\Users\thiago.leal\.claude\plans\recursive-painting-wave.md`. Fase 1 (Marketing/T.I.) em execução.
- Testadores são marcados com a tag **"Beta"** (criada em Admin → Membros → Gerenciar tags, atribuída via `assignMemberTags` já existente).
- Feedback virou um "chamado" completo, não mais popup: item "Feedback" na sidebar do membro (`src/components/members/member-feedback-widget.tsx`, só aparece com a tag Beta — checado em `src/app/(members)/dashboard/layout.tsx` e de novo, server-side, na própria página `src/app/(members)/dashboard/feedback/page.tsx` — bloqueia acesso direto por URL) leva para uma página com formulário completo (`feedback-ticket-form.tsx`: título, tipo, editor rico com imagem inline, link, anexos de foto) + lista "Minhas solicitações" (`my-feedback-list.tsx`).
- Dados em `feedback_reports` (migração `031`) + `title`/`link_url` (migração `032`) + `feedback_attachments` (tabela filha, bucket `feedback-attachments`). Visível em Admin → Feedback (`src/app/(admin)/admin/feedback/`).

## Atualização deste arquivo
Mantenha este CLAUDE.md atualizado com decisões arquiteturais, convenções novas ou contexto relevante descoberto durante o desenvolvimento. Não documente o óbvio — apenas o que um novo Claude não conseguiria derivar lendo o código.
