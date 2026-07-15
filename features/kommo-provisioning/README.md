# 📘 Feature: Kommo Provisioning (Integration Intelligence)

> **FASE 1 entregue: Analisador de Schema — ESTRITAMENTE READ-ONLY.**
> Não cria/edita/apaga nada (nem Kommo, nem banco). As fases seguintes (criar
> campos, escolher funil/etapa, gatilho no wizard) virão depois, com confirmação.
> Visão geral e roadmap: Artifact "Integration Intelligence" + [[project_integration_intelligence]].

## Visão Geral
Ao conectar o Kommo de um cliente, o objetivo é o sistema **entender sozinho** quais
campos precisam existir no CRM (a partir do que já chega da Meta) e provisioná-los
com um clique. Esta feature começa pela **análise** (o diff), que é 100% leitura.

## Estrutura Interna
- `schema-registry.ts`: **SchemaRegistry** — vocabulário canônico de conceitos com
  sinônimos. Casa rótulos da Meta ("Quando Deseja iniciar?") e do Kommo ("Qnd Começa:")
  ao mesmo conceito → casamento **semântico**, imune a nomes diferentes.
- `actions.ts`: `analyzeWorkspaceSchema(workspaceId)` (read-only) + `listWorkspaces()`.
- `components/SchemaAnalyzerPanel.tsx`: painel (seletor de cliente, resumo, diff por categoria).
- `index.ts`: superfície pública.

## Fluxo de Dados
`app/provisionamento/page.tsx` → `<SchemaAnalyzerPanel/>` → `analyzeWorkspaceSchema(id)`:
1. **Entrada**: lê `gestao_leads.raw_data` (payload bruto do webhook da Meta) → une as
   chaves do formulário. Cada chave é casada a um conceito via `matchConcept`.
2. **Destino**: lê os campos custom do Kommo (`GET /api/v4/leads/custom_fields`, read-only)
   e casa cada um a um conceito.
3. **Diff**: para cada conceito que chega pela entrada, verifica se o Kommo cobre
   (nativo ou campo casado). Marca `coberto` / `faltando` / `critico` (ex.: Facebook Lead ID).

## Por que SchemaRegistry (decisão de arquitetura)
Os nomes divergem entre Meta e Kommo (a Karol renomeou os campos). Casar por texto puro
daria falso-negativo. O registro de conceitos resolve isso e desacopla o motor da Meta:
qualquer fonte/CRM passa a falar o mesmo vocabulário. É a base para as próximas fases.

## Dependências Externas
- [x] Sim
  - Supabase (`@/lib/supabase/client` → `supabaseAdmin`): `core_workspaces`,
    `gestao_leads` (coluna `raw_data`, `leadgen_id`), `gestao_leads_destinations`.
  - Kommo API v4 (read-only): `GET /api/v4/leads/custom_fields`.

## 📦 Contrato de Portabilidade
> Regra de Ouro #7: não importa de outra feature.
- **UI global:** `components/ui/{card,table,badge,button}`, ícones `lucide-react`.
- **Serviços `lib/`:** `@/lib/supabase/client` (`supabaseAdmin`).
- **Import cruzado de outra feature?** ✅ Nenhum. `listWorkspaces` é cópia local mínima.

## Notas de Implementação
- **Só leitura** nesta fase. Nenhum POST/PATCH em Kommo ou banco.
- Fonte da entrada é `raw_data` (o que REALMENTE chega), não o schema declarado do form —
  mais fiel ao real. Para a Fase 2/blindagem, ver a matriz "chave × nome" no Artifact.
- Próximas fases: (2) criar campos faltantes com confirmação idempotente; (3) escolher
  pipeline/etapa; (4) gatilho no wizard "Conectar Kommo".
