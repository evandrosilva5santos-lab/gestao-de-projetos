# 📘 Feature: Reconciliation (Conferência de Leads)

> **ESTRITAMENTE READ-ONLY.** Não dispara WhatsApp, não cria/edita nada no Kommo,
> não escreve na planilha, não grava em tabela. Só LÊ e COMPARA.

## Visão Geral
Ferramenta de auditoria: dado um cliente (workspace), varre os leads dele e diz,
para cada um, **onde ele está** — no nosso banco (`gestao_leads`), no **Kommo** e na
aba **"CRM"** da planilha do cliente. Objetivo real: achar os leads que estão na
planilha/banco mas **faltam (como negócio) no Kommo**.

Nasceu de um caso real (cliente Karol): um lead ("Elizane") aparecia no Kommo apenas
como **contato**, grudado no negócio de outra pessoa — sem negócio próprio. Ver
"Critério do Kommo" abaixo.

## Estrutura Interna
- `actions.ts`: Server Actions `reconcileWorkspace(workspaceId)` e `listWorkspaces()`.
- `components/ReconciliationPanel.tsx`: painel client (seletor de cliente, tabela, filtros, resumo).
- `index.ts`: superfície pública da feature.

## Fluxo de Dados
`app/conferencia/page.tsx` → `<ReconciliationPanel/>` → `reconcileWorkspace(id)`
(Server Action, `supabaseAdmin` server-only). A action:
1. Lê `gestao_leads` do workspace.
2. Lê credenciais em `gestao_leads_destinations` (`kommo` e `google_sheets`).
3. **Planilha**: lê a aba `CRM` via `googleapis` (Service Account JWT, escopo
   `spreadsheets.readonly`) e monta o conjunto de telefones/e-mails presentes.
4. Monta o universo = **banco ∪ planilha CRM** (dedup por telefone normalizado).
5. **Kommo** (read-only): para cada lead, `GET /api/v4/contacts?query={tel}&with=leads`;
   casa pelo telefone real do contato; e confere se é **contato principal** de algum
   negócio (`GET /api/v4/leads/{id}?with=contacts`, campo `is_main`).
6. Retorna por lead `{ name, phone, email, inDb, inKommo, kommoOwnDeal, inSheetCRM, createdAt }`
   + resumo `{ total, faltando_no_kommo, faltando_na_planilha, so_contato_sem_negocio, ... }`.

### Casamento (sem Meta lead ID histórico)
`normalizePhone()` próprio (cópia local — não importa de fora): só dígitos, remove DDI
`55`, e usa os **últimos 8 dígitos** como chave (tolerante a DDD e ao 9º dígito).
Fallback secundário por e-mail.

### Critério do Kommo (importante)
- `inKommo = "yes"` → existe contato cujo telefone casa.
- `kommoOwnDeal = true` → esse contato é **principal (`is_main`)** de algum negócio.
- `kommoOwnDeal = false` → contato existe mas **não tem negócio próprio** (ex.: grudado
  no deal de outro). É o caso "Elizane" — aparece como 🟡 "só contato".
- Conferir só "tem algum deal vinculado" dá **falso positivo** (contato secundário de
  um deal alheio conta como deal); por isso checamos `is_main`.

## Dependências Externas
- [x] Sim
  - Supabase (`@/lib/supabase/client` → `supabaseAdmin`).
  - Kommo API v4 (read-only) — credenciais do destino `kommo`.
  - Google Sheets via `googleapis` + `google-auth-library` — credenciais do destino `google_sheets`.

## 📦 Contrato de Portabilidade
> Regra de Ouro #7: esta feature **não importa de outra feature**.
- **Módulos `features/_shared/` usados:** Nenhum.
- **UI global de `components/`:** `components/ui/{card,table,badge,button}`, ícones `lucide-react`.
- **Serviços de `lib/`:** `@/lib/supabase/client` (`supabaseAdmin`).
- **Pacotes npm:** `googleapis`, `google-auth-library`.
- **Tabelas Supabase:** `core_workspaces`, `gestao_leads`, `gestao_leads_destinations`.
- **Import cruzado de outra feature?** ✅ Nenhum. `normalizePhone` e os helpers de
  Kommo/Sheets são cópias mínimas locais (não reusa `lib/leads/integrations/*`).

## Notas de Implementação
- **Só leitura**: nenhuma chamada de escrita (POST/PATCH/PUT/DELETE) em nenhuma fonte.
- A base inclui a planilha porque, na prática, o histórico de leads de alguns clientes
  vive só na planilha (nem tudo está em `gestao_leads`). `inDb` reflete a origem real.
- Kommo tem rate limit (~7 req/s); a action espaça as chamadas com pequenos `sleep`.
  Para workspaces muito grandes, considerar paginação/lotes no futuro.
- Sem componente `Select` no design system: o seletor de cliente usa `Button` (chips).
