# 📘 Feature: Leads (Motor de Distribuição de Leads)

## Visão Geral
Recebe leads do Meta Lead Ads, normaliza os dados, distribui pelo rodízio de vendedores ("fila da vez") de forma atômica, e notifica via WhatsApp (Evolution API). Substitui a automação N8N legada (Karol Shutz / Mega Invest). Ver [docs/PRD-MODULO-LEADS.md](../../docs/PRD-MODULO-LEADS.md) e [docs/PLANO-EXECUCAO-MODULO-LEADS.md](../../docs/PLANO-EXECUCAO-MODULO-LEADS.md).

## Estrutura Interna
- `components/`: `LeadsDashboardShell` (sidebar + navegação por abas), `OverviewTab`, `MetaConnectionsTab`, `SellersQueueTab`, `FacebookIcon`.
- `actions.ts` *(a criar)*: Server Actions — toggle de vendedor, salvar conexão Meta, configurar notificação.
- `hooks.ts` *(a criar)*: Hooks TanStack Query + assinatura Supabase Realtime por `workspace_id`.

O motor assíncrono (sem UI) vive em `lib/inngest/functions.ts` (função `processNewLead`), não dentro desta pasta — é infraestrutura compartilhável, não visual.

## Fluxo de Dados
1. Webhook da Meta (`app/api/webhooks/leads/route.ts`) recebe o lead e dispara o evento `lead/received` no Inngest.
2. `processNewLead` (Inngest, `lib/inngest/functions.ts`) normaliza os dados, deduplica, chama a função SQL atômica `assign_next_seller()` para escolher o vendedor da vez, salva em `gestao_leads`, notifica via Evolution API e grava auditoria em `gestao_leads_audit_logs`.
3. **UI hoje é mock** (`useState` com dados fixos) — ainda não lê do Supabase. Ligação real com TanStack Query + Server Actions está prevista para a Fase 5 do plano de execução.

## Tabelas Supabase (nomenclatura em [DATABASE-NAMING.md](../../00%20-%20Regras/DATABASE-NAMING.md))
- `gestao_leads` — tabela central do módulo.
- `gestao_leads_sellers` — vendedores do rodízio (sem login; **não** confundir com `core_workspace_users`).
- `gestao_leads_meta_connections` — páginas Meta conectadas por workspace.
- `gestao_leads_notification_configs` — config do WhatsApp/Evolution API por workspace.
- `gestao_leads_audit_logs`, `gestao_leads_distribution_rules` — apoio/auditoria.

## Dependências Externas
- [x] Sim (Liste-os): Meta Graph API (webhook `leadgen`), Kommo API (destino de entrega), Evolution API (WhatsApp), Inngest (fila assíncrona).

## Notas de Implementação
- **Rodízio é atômico**: `assign_next_seller(p_workspace_id)` usa `FOR UPDATE SKIP LOCKED` numa única operação SQL — nunca faça `SELECT` + `UPDATE` separados para escolher o vendedor da vez (isso reintroduz a condição de corrida do fluxo N8N original).
- Vendedores do rodízio vivem em `gestao_leads_sellers`, não em `core_workspace_users` — vendedores não têm login na plataforma.
- Quando não há vendedor disponível, o lead fica com `status = 'waiting_seller'` (não é erro).
- Nenhuma credencial (Evolution, Kommo, Meta) deve ser hardcoded — tudo vem de `gestao_leads_notification_configs` / `gestao_leads_meta_connections` no banco.
