# 📘 Feature: Traffic (Gestão de Tráfego)

> **Status: SCAFFOLD / BACKLOG — última prioridade.**
> Estrutura e contrato prontos; implementação **não** feita de propósito.
> Roadmap e ordem de execução em [`docs/BACKLOG-GESTAO-TRAFEGO.md`](../../docs/BACKLOG-GESTAO-TRAFEGO.md).

## Visão Geral
Transforma o app (hoje focado em **entrega/leads**) também em uma ferramenta de
**gestão de tráfego pago**. O objetivo é centralizar, por cliente (workspace), as 4
capacidades abaixo. Nada aqui está implementado ainda — os arquivos são um scaffold
tipado para acelerar a construção futura sem redesenhar a arquitetura.

## Capacidades planejadas (as 4)
1. **Conexão de contas de anúncio** — conectar Meta Ads / Google Ads (e futuramente
   TikTok) por cliente, guardando `externalAccountId`, status e credenciais/IDs.
   → `getAdAccounts(workspaceId)`
2. **Gestão de campanhas** — cadastrar/organizar campanhas, orçamentos, objetivo e
   status por cliente. → `getCampaigns(workspaceId)`
3. **Dashboard de métricas de ads** — gasto, ROAS, CPC, CPM, CTR, conversões numa
   janela de tempo. → `getTrafficMetrics(workspaceId, period)`
4. **Relatório para o cliente final** — página read-only por token público (espelha o
   `client-portal` de leads). → `getTrafficReportByClientToken(token)`

## Estrutura Interna
- `types.ts`: tipos base (`AdAccount`, `Campaign`, `TrafficMetrics`, `ClientTrafficReport`, `ActionResult<T>`).
- `actions.ts`: Server Actions (stubs tipados; retornam erro "não implementado" até serem construídas).
- `components/`: _(a criar na implementação)_ — dashboard, tabela de campanhas, formulário de conexão.

## Fluxo de Dados (pretendido)
Componente da rota (`app/trafego/…`) → hook/action de `features/traffic/actions.ts` →
`supabaseAdmin` (server-only) filtrando por `workspace_id`. Métricas reais virão de uma
fonte de dados de ads (ex.: Reportei MCP, Meta Marketing API, Google Ads API) a definir
na implementação.

## Dependências Externas
- [x] Sim (na implementação futura)
  - Supabase (`lib/supabase/client` → `supabaseAdmin`).
  - Fonte de métricas de ads a definir: **Reportei**, **Meta Marketing API** ou **Google Ads API**.

## 📦 Contrato de Portabilidade (o que copiar junto)
> Regra de Ouro #7: esta feature **nunca importa de outra feature**.

- **Módulos `features/_shared/` usados:** Nenhum por enquanto. Se reaproveitar UI de
  conexão de integrações, **duplicar** o trecho mínimo (não importar de `features/_shared` de outra feature).
- **UI global de `components/`:** `components/ui/*` (card, table, badge, button, dialog).
- **Serviços de `lib/`:** `lib/supabase/client` (`supabaseAdmin`).
- **Tabelas Supabase / migrations (a criar):**
  - `gestao_ad_accounts` (contas conectadas por workspace).
  - `gestao_campaigns` (campanhas por workspace/conta).
  - `gestao_traffic_metrics` **ou** consumo direto de API externa (decisão pendente).
  - Token público de relatório: reutilizar `core_workspaces.client_access_token`
    (mesma coluna já usada pelo `client-portal`).
- **Variáveis de ambiente (`.env`):** a definir por plataforma — ex.: `META_ADS_ACCESS_TOKEN`,
  `GOOGLE_ADS_DEVELOPER_TOKEN`, `REPORTEI_API_KEY`.
- **Import cruzado de outra feature?** ✅ Nenhum (obrigatório).

## Notas de Implementação
- **Não** implementar sem antes fechar a decisão da **fonte de métricas** (Reportei vs
  API nativa) — muda o modelo de dados (tabela própria vs proxy de API).
- O **relatório do cliente** (capacidade 4) deve espelhar o padrão já pronto em
  `features/client-portal` + `app/portal/[token]` (token público, read-only, sem login).
- A tela interna de tráfego provavelmente vive sob o route group `app/(protected)` na
  implementação real; o placeholder atual (`app/trafego/page.tsx`) é apenas informativo.
