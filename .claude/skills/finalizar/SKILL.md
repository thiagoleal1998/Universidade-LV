---
name: finalizar
description: Ritual de fim de tarefa da Universidade LV — checa o build, incrementa a versão, documenta, commita, faz push, deploya na VPS e atualiza o Notion. Use quando um conjunto de mudanças estiver pronto para ir ao ar, ou quando o usuário disser "finaliza", "sobe isso", "publica" ou equivalente.
---

# Finalizar uma tarefa

Os 6 passos abaixo são o "terminar a tarefa" neste projeto. Pular um deixa a plataforma inconsistente (versão errada no rodapé, produção desatualizada, equipe sem saber o que mudou).

Faça na ordem. Se algum passo falhar, pare e resolva antes de seguir.

## 1. Build limpo

```bash
npx tsc --noEmit && npm run build
```

Os dois precisam passar. Erro de tipo aqui é mais barato que erro em produção.

## 2. Versão

Incremente `APP_VERSION` em `src/lib/version.ts`, semver:
- **patch** (x.x.N) — correção de bug, ajuste visual, melhoria pequena
- **minor** (x.N.0) — funcionalidade nova ou mudança relevante de UX
- **major** — mudança arquitetural grande (raríssimo)

## 3. Documentar

- **Armadilha nova, convenção nova, regra de autorização** → `CLAUDE.md`, em uma ou duas frases no imperativo.
- **A investigação que levou até ela, ou descrição de feature que já estabilizou** → `docs/historico-tecnico.md`.

Nada a documentar é uma resposta válida — não invente. Não documente o óbvio.

## 4. Commit e push

```bash
git add <arquivos específicos>
git commit -m "<mensagem em português>"
git push origin main
```

- Mensagem em **português**, descrevendo o efeito para quem usa, não o diff.
- **Nunca `git add -A`** sem revisar o que entrou.
- Nunca force-push em `main`.

## 5. Deploy

```bash
npm run deploy
```

Roda `git pull && npm install && npm run build && pm2 restart` na VPS e resume a saída. Se falhar, imprime tudo — leia antes de tentar de novo.

## 6. Notion

Atualize a documentação da equipe (`mcp__claude_ai_Notion__*`; se as ferramentas não aparecerem, busque com ToolSearch por "notion"):

- **Sempre** — linha nova em "Histórico de Versões": versão, data, e o que mudou **em linguagem de negócio** (quem lê é a equipe, não devs).
- **Se for feature ou mudança de stack** — atualize também "Funcionalidades" e/ou "Arquitetura & Stack".

Se o conector aparecer como não autorizado, avise o usuário — não dá para autorizar de dentro da sessão.

**Exceção:** mudança puramente interna de ferramenta de desenvolvimento (script, agente, configuração) não interessa à equipe de negócio. Nesses casos, confirme com o usuário antes de pular este passo.

## Antes de dizer que terminou

- Migração SQL nova? Ela **não** roda sozinha — confirme que o usuário já executou no SQL Editor do Supabase. Sem isso, o deploy sobe código que quebra em produção.
- Arquivos temporários de teste apagados e contas descartáveis removidas.
