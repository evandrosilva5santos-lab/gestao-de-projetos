# 📘 Feature: Metrics (Dashboard de Métricas da Agência)

## Visão Geral
Visão consolidada, read-only, de KPIs de todos os clientes: volume de leads (hoje/total), distribuídos, aguardando vendedor, erros, taxa de sucesso e descartes (formulário não monitorado), além de quebra por cliente e por origem. Implementa o PRD #9 (`docs/TOP-10-PRDS-ORDEM-EXEC.md`). Rota: `/metrics`.

## Estrutura Interna
- `actions.ts`: Server Action `getAgencyMetrics()` — agrega `gestao_leads` e `gestao_leads_audit_logs`.
- `components/MetricsDashboard.tsx`: UI (cards de KPI + tabela por cliente + lista por origem), client component com botão Atualizar.

## Fluxo de Dados
`app/metrics/page.tsx` renderiza `MetricsDashboard`, que chama `getAgencyMetrics()` no mount (e no Atualizar). Tudo via Server Action + `supabaseAdmin` no servidor — nenhuma credencial no browser.

## Dependências Externas
- [x] Não (só banco Supabase).

## 📦 Contrato de Portabilidade (o que copiar junto)
- **Módulos `features/_shared/`:** nenhum.
- **UI global de `components/`:** `components/ui/{card,table,badge,button}`.
- **Serviços de `lib/`:** `lib/supabase/client` (`supabaseAdmin`).
- **Tabelas Supabase:** `gestao_leads` (status/source/workspace_id/created_at), `gestao_leads_audit_logs` (action/created_at — usa `ignored_unmonitored_form`), `core_workspaces` (name).
- **Variáveis de ambiente:** as do Supabase (service role).
- **Import cruzado de outra feature?** ✅ Nenhum (Regra de Ouro #7).

## Notas de Implementação
- Read-only: nenhuma escrita. Seguro para expor a admins.
- A quebra por cliente/origem usa uma janela dos últimos 1.000 leads (volume baixo nesta fase). Se o volume crescer, migrar para agregação SQL (`group by`) via RPC.
- `successRate` é `null` quando não houve tentativa de distribuição hoje (evita "0%" enganoso).
