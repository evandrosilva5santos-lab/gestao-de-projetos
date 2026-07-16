# 🔍 Auditoria: Botões Reais vs. Fictícios

> Levantamento completo de toda a UI do app (todas as abas/features) para separar o que
> **funciona de verdade** (bate em API/Supabase real) do que é **decorativo** (não faz
> nada, é mock, ou tem um `TODO` no código). Feito em 2026-07-15, sem alterar nenhum código
> — é um mapa para orientar a correção.
>
> **Como ler:** 🟢 REAL · 🟡 PARCIAL (faz algo, mas não o que o rótulo promete) · 🔴 FICTÍCIO
> (não faz nada ou é mock puro). Cada linha tem arquivo:linha pra você abrir direto.

## Achado nº 1 — o bug da sua screenshot (confirmado no código)

Em **duas telas centrais**, o clique nos botões cai numa função `handleAction` que só
sabe tratar `"edit"` — qualquer outra ação (`test`, `sync`, `renew`, `disconnect`) entra
na função e **sai sem fazer nada**:

```ts
// features/integration-hub/components/IntegrationHubTab.tsx:137
// features/leads/components/ClientDestinationsTab.tsx:104
const handleAction = (action: string, connection: Connection) => {
  if (action === "edit") { /* ... */ }
  // qualquer outro "action" (test/sync/renew/disconnect) → não faz nada
};
```

Os botões aparecem clicáveis no `ConnectionCard`, mas **não estão ligados a nenhuma
Server Action** para essas ações. É exatamente o que você viu: clicar em "Testar" ou
"Sincronizar" na Central de Integrações não muda nada.

---

## 1. Central de Integrações (`/configuracoes` → aba Integrações · `IntegrationHubTab.tsx`)

| Botão | Status | Local | O que realmente acontece |
|---|---|---|---|
| **Testar** (Kommo/Sheets/Evolution/Meta) | 🔴 FICTÍCIO | [IntegrationHubTab.tsx:137](../features/integration-hub/components/IntegrationHubTab.tsx#L137) | `handleAction` ignora `"test"`. Nada é chamado. |
| **Sincronizar** (Meta) | 🔴 FICTÍCIO | mesmo arquivo | `handleAction` ignora `"sync"`. |
| **Renovar token** (Kommo) | 🔴 FICTÍCIO | mesmo arquivo | `handleAction` ignora `"renew"`. |
| **Desconectar** (todos) | 🔴 FICTÍCIO | mesmo arquivo | `handleAction` ignora `"disconnect"`. A Server Action real `deleteSource()` ([actions.ts:309](../features/_shared/integrations/actions.ts#L309), faz `DELETE` de verdade) **existe mas não é chamada em lugar nenhum do app**. |
| **Editar** (Kommo/Sheets/Evolution) | 🟢 REAL | mesmo arquivo | Abre o modal pré-preenchido; ao salvar, faz `upsert` real no Supabase. |
| **Editar** (Meta) | 🟡 PARCIAL | mesmo arquivo | Abre o modal, mas o card Meta não passa `config` — reabre em branco, não restaura a conexão específica. |
| **+ Nova integração** | 🟢 REAL | mesmo arquivo | Abre o wizard real. |

## 2. Aba Destinos (por cliente · `ClientDestinationsTab.tsx`)

| Botão | Status | Local | O que realmente acontece |
|---|---|---|---|
| **Testar** (Kommo/Sheets/Evolution) | 🔴 FICTÍCIO | [ClientDestinationsTab.tsx:104](../features/leads/components/ClientDestinationsTab.tsx#L104) | Mesmo padrão: `handleAction` só trata `"edit"`. |
| **Desconectar** | 🔴 FICTÍCIO | mesmo arquivo | Idem — nada acontece. |
| **Editar** (Kommo/Sheets/Evolution) | 🟢 REAL | mesmo arquivo | `upsert` real ao salvar. |
| **Editar "Meta Business Manager"** → Buscar contas / Salvar seleção | 🟢 REAL | `ClientMetaAdAccountsTab.tsx` | Bate na Graph API real e grava em `gestao_leads_meta_ad_accounts`. |
| **Novo destino** | 🟢 REAL | mesmo arquivo | Abre o wizard real. |

## 3. Aba Fontes de Entrada (por cliente · `ClientSourcesTab.tsx`) — só Meta

| Botão | Status | O que realmente acontece |
|---|---|---|
| **Testar** | 🟢 REAL | Bate na Graph API de verdade (`testMetaConnection`). |
| **Sincronizar** | 🟡 PARCIAL | Chama a **mesma função** que "Testar" — bate na API real, mas **não persiste nada** (não é upsert de formulários), apesar do nome sugerir sincronização de dados. |
| **Desconectar** | 🔴 FICTÍCIO | Mesmo bloqueio: `handleAction` só aceita `"test"`/`"sync"`. |
| **+ Nova integração** | 🟢 REAL | Abre o seletor de provedor real. |

## 4. Modal "Nova Integração" (wizard de 3 passos)

| Botão | Status | O que realmente acontece |
|---|---|---|
| **Salvar** (Kommo) | 🟢 REAL | `upsert` real + busca vendedores no Kommo (`fetchKommoUsers`). |
| **Salvar** (Google Sheets) | 🟢 REAL | `upsert` real no Supabase. |
| **Salvar** (Evolution/WhatsApp) | 🟢 REAL | `upsert` real no Supabase. |
| **Salvar** (Meta) | 🟢 REAL | `upsert` real + valida token na Graph API antes de salvar. |
| **Salvar** (Google Ads / Lead Forms) | 🔴 FICTÍCIO | Comentário no próprio código: `// Mock para Google Ads / Lead Forms (placeholder)`. Monta um objeto fake na hora, `maskedToken` fixo, nunca chama `actions.ts`. |
| **Entrar com Google (OAuth)** | 🔴 FICTÍCIO | Só avança o wizard (`setStep(2)`). Não abre OAuth nenhum. |
| **Validar token** (passo Google) | 🔴 FICTÍCIO | Idem — só avança o passo. O campo de token nem tem `onChange` (o que você digita não é salvo em lugar nenhum). |
| **Passo 2 do provedor Google** (selecionar Business Manager / Página / Formulários) | 🔴 FICTÍCIO | `<select>` sem `value`/`onChange` — opções fixas no código ("Agência Start", "Clínica Sorriso"). Formulários vêm de `MOCK_FORMS` hardcoded. |
| **Buscar** (planilhas Google) / **Ver abas** | 🟢 REAL | Bate na Drive/Sheets API de verdade. |
| **Buscar Grupos** (WhatsApp/Evolution) | 🟢 REAL | Bate na Evolution API real, com proteção anti-SSRF. ⚠️ só funciona quando o modal tem `workspaceId` — dentro da Central de Integrações (Hub) esse fluxo fica inutilizável por falta desse dado. |
| **Ressincronizar** / **Buscar novos** (formulários Meta) | 🟢 REAL | Bate na Graph API + grava cache no Supabase. |
| **Pipeline ID / Status ID** (Kommo) | ⚪ NÃO EXISTE COMO BUSCA | São campos de **texto livre** — você digita o ID manualmente. Não existe nenhuma função que busque os pipelines reais do Kommo (`GET /api/v4/leads/pipelines`). Não é um botão quebrado — é uma automação que nunca foi construída (ver `docs/SPEC-KOMMO-UPSERT.md` / Fase 3 do Integration Intelligence). |

## 5. Fila da Vez / Vendedores (`SellersQueueTab.tsx`) — tudo real ✅

Ativar/Pausar vendedor, Passar a vez, Adicionar/Editar/Remover vendedor, toggles de
regras (qualificação, horário, pausa de entrada), botão Atualizar — **todos** fazem
`insert`/`update`/`delete` reais em `gestao_leads_sellers` / `gestao_leads_workspace_rules`.

## 6. Logs (`LogsTab.tsx`) — tudo real ✅

Todos os filtros (origem, status, vendedor, data) disparam query real no Supabase.

## 7. Operações (`OperationQueueBoard.tsx`)

| Item | Status | Observação |
|---|---|---|
| Botão **Atualizar** | 🟢 REAL | Lê `gestao_leads` + `gestao_leads_audit_logs` de verdade. |
| Regras de Roteamento / Configurações | ⚪ read-only por design | Sem botões de escrita — o próprio painel avisa "Acesso read-only nesta versão". Não é bug. |

## 8. Métricas (`app/metrics`) — real ✅

Botão Atualizar roda 8 queries reais em paralelo.

## 9. Tráfego (`app/trafego`) — placeholder intencional

Sem botões. É o scaffold do backlog (última prioridade), como já documentado.

## 10. Topo do painel (`LeadsDashboardShell.tsx`)

| Botão | Status |
|---|---|
| **Novo Lead** | 🔴 FICTÍCIO — renderizado sem `onClick`. |
| **Sair** (logout) | 🔴 FICTÍCIO — renderizado sem `onClick`, não desloga. |
| Toggle de tema (sol/lua) | 🟢 REAL (é só visual mesmo, não finge integração) |
| Navegação da sidebar / abas | 🟢 REAL |

## 11. Código morto (não afeta o que você vê hoje, mas está no repo)

`features/leads/components/MetaConnectionsTab.tsx` é **100% mock** (estado local em
memória, `TODO` explícito no topo do arquivo) — porém **não está roteado em lugar
nenhum da navegação atual**. Não é a causa de nenhum bug visível; é sobra de uma versão
anterior. Candidato a exclusão.

## 12. Minhas features novas — read-only por design (não são bugs)

`/conferencia`, `/provisionamento` e `/portal/[token]` são intencionalmente somente
leitura (auditoria e diagnóstico) — não têm botão de escrita porque essa não é a
função delas.

---

## 🛠️ Prioridade de correção sugerida

1. ✅ **Ligar os `handleAction` do Hub e de Destinos.** — commit `016b868`.
   `handleAction` agora trata `test`/`disconnect`/`renew`, ligados às Server
   Actions reais (`deleteDestination`, `deleteMetaConnection`, `testKommoConnection`,
   `testSheetsConnection`, `testEvolutionConnection`, `testMetaConnection`).
2. ✅ **Funções de "Testar" para Kommo/Sheets/Evolution.** — commit `016b868`.
   `pingKommoAccount` (`GET /api/v4/account`), `testSheetsConnection` (lê o
   cabeçalho real da aba) e `testEvolutionConnection` (`GET /instance/fetchInstances`)
   criadas em `lib/leads/integrations/kommo.ts` / `features/_shared/integrations/actions.ts`.
3. ✅ **Fluxo "Google" no wizard.** — commit `849a63e`. Decisão: remover (era 100%
   mock — OAuth fake, selects sem `onChange`, `MOCK_FORMS` hardcoded) até estar
   pronto de verdade, em vez de deixar enganando o usuário.
4. ✅ **Botões órfãos "Novo Lead" e "Sair".** — commit `849a63e`. Removidos (sem
   `onClick`, decorativos).
5. ✅ **Busca automática de pipelines do Kommo.** — commit `c97bdb5`.
   `fetchKommoPipelines` (`GET /api/v4/leads/pipelines`) substitui os campos de
   texto "Pipeline ID"/"Status ID" por dois `<select>` com nomes reais (com
   fallback manual). Filtra apenas os status `142`/`143` ("Fechado - ganho/perdido"
   — IDs fixos e universais em qualquer pipeline do Kommo, confirmado contra a
   conta real da Karol), mantendo a etapa de entrada disponível como opção.
6. ✅ **Limpeza:** `MetaConnectionsTab.tsx` removido. — commit `849a63e`.

**Todos os 6 itens desta lista estão resolvidos.** Próximos passos possíveis ficam
a critério do produto — não há mais nenhum botão fictício mapeado nesta auditoria.
