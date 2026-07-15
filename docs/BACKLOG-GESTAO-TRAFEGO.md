# 🗂️ Backlog — Gestão de Tráfego

> **Prioridade: ÚLTIMA.** Fazer somente depois que todo o restante do roadmap
> (leads / entrega) estiver concluído. Registrado a pedido: "salve como última
> coisa a ser realizada".

## Objetivo
Transformar o app (hoje focado em entrega/leads) também em uma ferramenta de
**gestão de tráfego pago**, por cliente (workspace).

## O que já está pronto (scaffold — não implementado)
- `features/traffic/types.ts` — tipos base das 4 capacidades.
- `features/traffic/actions.ts` — Server Actions em stub (retornam "não implementado").
- `features/traffic/README.md` — visão, contrato de portabilidade e notas.
- `app/trafego/page.tsx` — rota placeholder ("Em breve").

## Capacidades a implementar (nesta ordem sugerida)
1. **Conexão de contas de anúncio** (Meta Ads / Google Ads por cliente).
2. **Dashboard de métricas** (gasto, ROAS, CPC, CPM, CTR, conversões).
3. **Gestão de campanhas** (orçamentos, objetivo, status).
4. **Relatório para o cliente final** (read-only por token — espelhar `client-portal`).

## ⚠️ Decisão pendente ANTES de codar
**Fonte das métricas de ads**, pois define o modelo de dados:
- **Reportei** (MCP já disponível no ambiente) → mais rápido, menos infra.
- **Meta Marketing API + Google Ads API** (nativo) → mais controle, mais trabalho.

## Regras a seguir na implementação
- Feature-Sliced: lógica em `features/traffic/`, rota fina em `app/`.
- Regra de Ouro #7: **não** importar de outra feature (duplicar helpers mínimos).
- Isolamento: filtrar **sempre** por `workspace_id`.
- `supabaseAdmin` só no servidor; nunca expor credenciais ao browser.
- Design: componentes `@/components/ui/*` + tokens CSS, dark mode (sem hex mágicos).
- Tela interna provavelmente sob `app/(protected)`; token público reutiliza
  `core_workspaces.client_access_token`.
