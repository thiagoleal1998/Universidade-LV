# Universidade LV

> Plataforma de ensino para agentes de viagem da rede Litoral Verde.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?logo=tailwindcss)

## Sobre

A Universidade LV é uma plataforma interna de capacitação para agentes de viagem. Permite que membros acessem cursos, aulas, treinamentos ao vivo e replays, além de acompanhar seu progresso e receber comunicados da rede.

O painel administrativo permite gerenciar cursos, módulos, aulas, treinamentos, comunicados, configurações do site e controle de acesso por membro.

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS + shadcn/ui |
| Ícones | Lucide React |
| Notificações | Sonner |
| Backend / Auth | Supabase (Postgres + Storage + RLS) |
| Deploy | Vercel |

## Pré-requisitos

- Node.js 18+
- npm 9+
- Acesso ao projeto Supabase (solicitar credenciais ao administrador)

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/thiagoleal1998/Universidade-LV.git
cd Universidade-LV

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Preencha os valores no .env.local
```

## Variáveis de ambiente

Crie `.env.local` na raiz com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave anon do projeto>
SUPABASE_SERVICE_ROLE_KEY=<chave service role do projeto>
```

> As chaves estão disponíveis em: Supabase Dashboard → Project Settings → API.

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm run start    # Inicia o build de produção localmente
npm run lint     # Verifica erros de lint (ESLint)
```

## Estrutura de pastas

```
src/
├── app/
│   ├── (members)/
│   │   └── dashboard/         # Área do aluno (layout, página, subpáginas)
│   ├── admin/                 # Painel administrativo
│   ├── actions/               # Server Actions (Supabase mutations)
│   └── api/                   # API Routes (quando necessário)
├── components/
│   ├── admin/                 # Componentes exclusivos do painel admin
│   ├── members/               # Componentes da área do aluno
│   └── ui/                    # Componentes reutilizáveis (shadcn/ui)
└── lib/
    ├── supabase/
    │   ├── server.ts          # Cliente com sessão do usuário (respeita RLS)
    │   ├── admin.ts           # Cliente com service role (bypassa RLS)
    │   └── browser.ts         # Cliente para uso em Client Components
    ├── settings.ts            # Tipagem e defaults das configurações do site
    └── version.ts             # Versão atual (APP_VERSION — atualizar a cada deploy)
```

## Banco de dados (Supabase)

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Usuários com role (`admin` / `member`) |
| `courses` | Cursos disponíveis |
| `modules` | Módulos dos cursos |
| `lessons` | Aulas individuais |
| `member_courses` | Controle de acesso por membro |
| `member_progress` | Progresso de aulas concluídas |
| `training_items` | Treinamentos ao vivo, replay e link |
| `training_materials` | Materiais de apoio dos treinamentos |
| `notifications` | Notificações por usuário |
| `announcements` | Comunicados com agendamento e expiração |
| `site_settings` | Configurações do site (pares chave-valor) |

Migrações ficam em `supabase/migrations/` e devem ser aplicadas via Supabase Dashboard (SQL Editor) ou CLI.

## Deploy

O projeto é implantado automaticamente via **Vercel** a cada push na branch `main`.

Variáveis de ambiente de produção são configuradas diretamente no painel da Vercel (Settings → Environment Variables).

---

**Criado por** Thiago Leal da Silva
