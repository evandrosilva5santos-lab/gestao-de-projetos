# 📘 Feature: Client Portal (Portal do Cliente)

## Visão Geral
Página pública onde o **cliente final** acessa por um link com token (`/portal/[token]`) e vê,
somente-leitura, os leads do próprio workspace em tempo quase real — **sem login**. É o PRD #8
(`docs/TOP-10-PRDS-ORDEM-EXEC.md`). Espelha o padrão da rota `/fila/[token]` (token público).

## Estrutura Interna
- `actions.ts`: Server Action `getLeadsByClientToken(token)` — valida o token, resolve o
  workspace e retorna os leads **daquele** workspace (nome, contato, origem, vendedor, status,
  data), ordenados por `created_at DESC`, `limit 100`.
- Não há `components/` próprios: a UI de rota vive em `app/portal/[token]/` (Server Component fino
  + `PortalLeadsClient` client component), seguindo o padrão de `/fila/[token]`.

## Fluxo de Dados
1. `app/portal/[token]/page.tsx` (Server Component) resolve o `token` do route param e o repassa.
2. `PortalLeadsClient` (`"use client"`) chama a Server Action `getLeadsByClientToken(token)`.
3. A action usa `supabaseAdmin` (server-only) para resolver o token em `core_workspaces`
   (`client_access_token`) e buscar `gestao_leads` filtrando por `workspace_id`.
4. O cliente renderiza a tabela com filtro de status (Todos/Distribuído/Aguardando/Erro) e
   auto-refresh a cada 30s (`setInterval` → nova chamada da action, sem libs externas).

## Segurança
- Os dados são **estritamente filtrados por `workspace_id`** derivado do token. Um token nunca
  enxerga lead de outro cliente.
- O `supabaseAdmin` (service role) é usado **apenas no servidor** (Server Action). O token e as
  credenciais **nunca** são expostos ao browser.
- Token inválido → `{ success: false, error: "Link inválido." }`.
- A superfície é **read-only**: não há nenhuma action de escrita nesta feature.

## Dependências Externas
- [x] Sim
  - Supabase (`lib/supabase/client` → `supabaseAdmin`).
  - Tabelas `core_workspaces` (coluna `client_access_token`) e `gestao_leads` (+ relação
    `gestao_leads_sellers`).

## 📦 Contrato de Portabilidade (o que copiar junto)
> Regra de Ouro #7: esta feature **nunca importa de outra feature**.

- **Módulos `features/_shared/` usados:** Nenhum.
- **UI global de `components/`:** `components/ui/{card,table,badge,button}` — garantir que existam
  no destino. Ícones via `lucide-react`.
- **Serviços de `lib/`:** `lib/supabase/client` (`supabaseAdmin`) — copiar junto.
- **Tabelas Supabase / migrations:**
  - `core_workspaces` com a coluna `client_access_token`
    (migration `20260714020000_add_client_access_token.sql`).
  - `gestao_leads` (colunas: `id, name, phone, email, source, status, seller_id, created_at,
    workspace_id`) e `gestao_leads_sellers` (`id, name`).
- **Variáveis de ambiente (`.env`):** `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Import cruzado de outra feature?** ✅ Nenhum. O helper de resolução de token
  (`getWorkspaceByToken`) é uma **cópia mínima e independente** — não importa de `features/leads`.

## Notas de Implementação
- O helper `getWorkspaceByToken` foi **duplicado** de propósito (não importado de `features/leads`)
  para respeitar a Regra de Ouro #7 e manter a feature portável.
- Mapeamento de status para o filtro: `distributed → Distribuído`, `error → Erro`, qualquer outro
  valor → `Aguardando`. Ajustar em `PortalLeadsClient` (`statusGroup`) se novos status surgirem.
- Auto-refresh usa `setInterval` (30s) chamando a Server Action novamente; sem `router.refresh()`
  para preservar o estado de filtro selecionado no cliente.
