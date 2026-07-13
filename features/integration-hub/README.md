# 📘 Feature: Integration Hub (Central de Integrações)

## Visão Geral
Tela onde uma conexão (token) com um provedor externo (Meta, Google, Google Sheets, Kommo, Evolution API) é cadastrada **uma única vez, no nível do sistema**, e reutilizada por N workspaces — os workspaces nunca cadastram token nem ID manualmente. **Porte pixel-exato** do protótipo de design fornecido pelo usuário (`Agency OS.dc.html`, seção "Central de Integrações", linhas ~795-885 do arquivo original; modal em ~1395-1450). Ver [docs/PRD-FONTES-DE-ENTRADA.md](../../docs/PRD-FONTES-DE-ENTRADA.md) e [docs/ARQUITETURA-MOTOR-DE-LEADS.md](../../docs/ARQUITETURA-MOTOR-DE-LEADS.md).

## ⚠️ Fidelidade ao design (importante para manutenção futura)
Esta tela **não usa os componentes genéricos de `components/ui/`** (Card/Badge/Button do shadcn). Usa `style={{ ... }}` inline com `var(--card)`, `var(--accent)` etc. — os mesmos nomes de variável do `.dc.html` original — porque os tokens shadcn (`--color-card` etc., em `app/globals.css`) têm valores OKLCH diferentes e não reproduziriam o visual exato pedido. Os tokens exatos (claro/escuro) vivem em `features/leads/lib/agency-os-theme.ts` e são aplicados uma única vez no elemento raiz de `LeadsDashboardShell`, herdados por CSS custom property em toda a árvore. **Qualquer alteração visual nesta tela deve ser conferida contra o arquivo original**, não improvisada.

## Estrutura Interna
- `components/ConnectionCard.tsx` — card de uma conexão: ícone do provedor, nome, badge de status (Conectado/Token expirado com motivo/Desconectado), token mascarado OU banner de motivo do erro (mutuamente exclusivos, conforme o original), contadores, linha de última sincronização, ações (variam por conexão via prop `actions`). Exporta também `NewIntegrationTile` (o card tracejado "+ Nova integração" ao final do grid).
- `components/NewIntegrationModal.tsx` — **modal overlay real** (não painel inline) de 3 passos: 0) escolher provedor (avança ao clicar na linha), 1) autenticação (OAuth ou System User Token — avança ao clicar em "Entrar com X" ou "Validar token"), 2) árvore Business▸Página▸Formulários + "Salvar integração". Sem botão genérico "Próximo": o avanço é sempre a ação de cada passo, igual ao original.
- `components/IntegrationHubTab.tsx` — tela principal (header + banner + grid 2 colunas com 3 conexões mock + tile de nova integração).
- `actions.ts` *(a criar)*: Server Actions — `createConnection`, `validateConnection`, `syncConnection`, `disconnectConnection`.
- `hooks.ts` *(a criar)*: TanStack Query lendo `gestao_leads_sources`.

## Fluxo de Dados
**Hoje (estado atual):** 100% mock — `IntegrationHubTab` mantém as conexões em `useState`; o modal simula a árvore com dados fixos. Nenhuma chamada real à Graph API ainda.

**Fluxo real (Fase 2 do plano de execução):** `NewIntegrationModal` chamará `lib/leads/providers/{meta,google}/index.ts` (`validateCredentials`, `listPages`, `listForms` — interface `LeadSourceProvider`, ver ARQUITETURA-MOTOR-DE-LEADS.md), persistindo em `gestao_leads_sources` / `_source_pages` / `_source_forms` via Server Action.

## Dependências Externas
- [x] Sim: Meta Graph API, Google API, Kommo API, Google Sheets API, Evolution API — todas via a camada `LeadSourceProvider`/`LeadIntegration`, nunca chamadas direto do componente.

## Notas de Implementação
- Token **sempre mascarado** na UI (`EAAB••••P9D`) — nunca renderizar o valor completo, mesmo em mock.
- Estratégia de token da Meta decidida: **System User Access Token** (não expira) — ver PRD-FONTES-DE-ENTRADA.md.
- Esta tela é distinta de `features/lead-sources` (Fontes de Entrada): aqui vive a conexão/token; lá vive o mapeamento Formulário → Workspace e a config por formulário.
- Ícones extraídos literalmente do `.dc.html` em `features/leads/components/icons/agency-os-icons.tsx` (mesmo path SVG) — não substituir por ícones "equivalentes" do lucide-react sem necessidade.
