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

## Notificações
- Tabela `notifications`: `id, user_id, type, title, body, link, read_at, created_at`
- Após inserir notificações: chamar `revalidatePath('/dashboard', 'layout')` para invalidar cache do unread count
- Tipos usados: `new_training`, `training_replay`, `training_live_expired`, `announcement`

## Convenções
- Server actions ficam em `src/app/actions/`
- Componentes admin em `src/components/admin/`
- Componentes UI reutilizáveis em `src/components/ui/`
- `settings` são pares chave-valor na tabela `site_settings`; tipo e defaults em `src/lib/settings.ts`

## Atualização deste arquivo
Mantenha este CLAUDE.md atualizado com decisões arquiteturais, convenções novas ou contexto relevante descoberto durante o desenvolvimento. Não documente o óbvio — apenas o que um novo Claude não conseguiria derivar lendo o código.
