# 📋 PRD: Central de Integrações + Fontes de Entrada

> **Validado contra o protótipo de design** (`Agency OS.dc.html` / `DOCUMENTACAO.md`, 2026-07-13): o design confirma e refina este PRD — a conexão (token) é um ativo de **nível sistema**, reutilizado por N workspaces, e "Cliente" = "Workspace" (mesma entidade, sem tabela nova). O design também separa isso em **duas telas/módulos** dentro do mesmo backend abaixo:
> - **Central de Integrações** (`/central-integracoes`) — cadastrar a conexão (token) uma única vez; descobrir Business ▸ Páginas ▸ Formulários.
> - **Fontes de Entrada** (`/fontes-de-entrada`) — visão operacional: tabela Formulário → Workspace + drawer de configuração por formulário (distribuição + integrações de destino).

## 1. Visão Geral
**Status:** Draft — aguardando aprovação (Golden Rule #1: nenhum código antes deste PRD aprovado)
**Objetivo Principal:** Módulo responsável por conectar qualquer plataforma geradora de leads via API oficial — sem cadastro manual de IDs. Fluxo: conectar conta (Central de Integrações) → descobrir páginas automaticamente → descobrir formulários automaticamente → mapear cada formulário a um workspace e configurá-lo individualmente (Fontes de Entrada). É o **primeiro módulo** do Motor de Leads — ver [ARQUITETURA-MOTOR-DE-LEADS.md](ARQUITETURA-MOTOR-DE-LEADS.md).

**Escopo desta versão:** Meta Lead Ads (completo, incluindo Google Sheets e Kommo como provedores de integração de saída) + estrutura pronta para Google Lead Forms (mesmo fluxo, conector diferente — implementação do conector Google pode ficar para uma segunda iteração, mas o schema já comporta). Extensível a TikTok, LinkedIn, RD Station, HubSpot sem alterar o Motor.

## 2. Casos de Uso (User Stories)

- Como Admin, eu quero cadastrar uma conexão com o Meta Business informando um token, e ter o sistema validando automaticamente se ele é válido (e me dizendo o motivo caso não seja), para não descobrir problemas só quando um lead falhar.
- Como Admin, eu quero ver a lista de páginas disponíveis para aquele token (sem digitar Page ID), para selecionar só as que devo monitorar.
- Como Admin, eu quero ver a lista de formulários Lead Ads de uma página selecionada (sem digitar Form ID), para escolher quais monitorar.
- Como Admin, eu quero configurar cada formulário individualmente — workspace, cliente, método de distribuição e quais integrações disparar (CRM, planilha, WhatsApp) — porque cada formulário pode servir um cliente e uma regra de negócio diferente.
- Como Admin, eu quero que o mesmo fluxo (conectar → listar → selecionar → configurar) funcione para Google Lead Forms, para não aprender uma UI diferente por origem.

## 3. Requisitos Arquiteturais (Obrigatório seguir ARCHITECTURE.md e ARQUITETURA-MOTOR-DE-LEADS.md)

**Caminhos das Features:**
- `/features/integration-hub` — Central de Integrações (conexões nível sistema)
- `/features/lead-sources` — Fontes de Entrada (mapeamento formulário → workspace + config)

**Rotas Envolvidas:**
- `/app/(protected)/central-integracoes` — cards de conexão (Meta, Google, Kommo, Sheets, Evolution), wizard "Nova integração" (Provedor → Autenticação → Árvore Business▸Página▸Formulários)
- `/app/(protected)/fontes-de-entrada` — tabela Formulário → Workspace + drawer de configuração (Passo 4)
- `/app/api/webhooks/meta` — webhook `leadgen` da Meta (substitui o webhook genérico atual para este provedor)
- `/app/api/webhooks/google` *(iteração futura)*

**Camada de Providers (obrigatória — ver seção 4 do ARQUITETURA-MOTOR-DE-LEADS.md):**
- `lib/leads/providers/meta/index.ts` implementa `LeadSourceProvider`: `validateCredentials`, `listPages`, `listForms`, `fetchLead`, `verifyWebhookSignature`.
- `lib/leads/providers/google/index.ts` — mesma interface, implementação placeholder nesta fase.
- **Nenhuma regra de negócio dentro do provider** — só tradução Graph API ↔ Modelo Canônico.

**Estratégia de token (Meta) — DECIDIDO:**
- **System User Access Token**, gerado no Business Manager (Configurações do Negócio → Usuários do Sistema). Não expira — mecanismo oficial da Meta para integrações server-to-server contínuas, atende literalmente ao requisito "acesso contínuo sem necessidade de autenticação frequente".
- `validateCredentials` ainda roda a cada conexão salva (e periodicamente via cron) para detectar revogação manual do token no Business Manager, mesmo sem expiração natural.
- Pré-requisito operacional: acesso administrativo ao Business Manager de cada cliente/agência para criar o Usuário do Sistema e gerar o token — passo manual antes de usar o wizard "Conectar" da UI.

**Mutações:** Server Actions em `features/lead-sources/actions.ts` (conectar source, sincronizar páginas, sincronizar formulários, salvar config do formulário) consumidas via TanStack Query.

## 4. Banco de Dados e Supabase (Esquema)

*Nomenclatura conforme [DATABASE-NAMING.md](../00%20-%20Regras/DATABASE-NAMING.md). Todas as tabelas com RLS ativado.*

**Tabela: `gestao_leads_sources`** (conexão nível conta — ex.: um token do Business Manager)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `provider_type` | Text | Sim | `meta` / `google` |
| `name` | Text | Sim | Nome descritivo da conexão |
| `credentials` | JSONB | Sim | Token e metadados (cifrado; nunca exposto ao client) |
| `status` | Text | Sim | `active` / `invalid` / `expired` |
| `last_validated_at` | Timestamptz | Não | Última validação bem-sucedida |
| `created_at` | Timestamptz | Sim | Default `now()` |

> **Nota de escopo:** esta tabela é um ativo de nível agência (um token pode enxergar páginas de vários clientes), por isso **não tem `workspace_id`** — o vínculo com workspace acontece no nível do formulário (`gestao_leads_form_configs`), conforme seu fluxo descrito (Passo 4). Acesso restrito a role administrativa (ver Critério de Aceite sobre RLS).

**Tabela: `gestao_leads_source_pages`** (páginas descobertas dentro de uma source)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `source_id` | UUID | Sim | FK `gestao_leads_sources.id` |
| `external_page_id` | Text | Sim | ID da página na Meta/Google |
| `name` | Text | Sim | Nome da página |
| `is_monitored` | Boolean | Sim | Default `false` — só entra no fluxo se selecionada |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Tabela: `gestao_leads_source_forms`** (formulários descobertos dentro de uma página)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `source_page_id` | UUID | Sim | FK `gestao_leads_source_pages.id` |
| `external_form_id` | Text **UNIQUE** | Sim | ID do formulário — chave de roteamento do webhook |
| `name` | Text | Sim | Nome do formulário |
| `is_monitored` | Boolean | Sim | Default `false` |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Tabela: `gestao_leads_form_configs`** (configuração de negócio por formulário — Passo 4)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `source_form_id` | UUID **UNIQUE** | Sim | FK `gestao_leads_source_forms.id` |
| `workspace_id` | UUID | Sim | FK `core_workspaces.id` |
| `distribution_method` | Text | Sim | `round_robin` (default) — extensível |
| `rules` | JSONB | Não | Mapeamento de campos / regras de qualificação específicas do formulário |
| `is_active` | Boolean | Sim | Default `true` |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Tabela: `gestao_leads_form_integrations`** (quais integrações disparar por formulário — N por formulário)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `form_config_id` | UUID | Sim | FK `gestao_leads_form_configs.id` |
| `integration_type` | Text | Sim | `kommo` / `sheet` / `evolution` / `webhook` |
| `config` | JSONB | Sim | Config específica daquela integração (credenciais, mapeamento) |
| `is_active` | Boolean | Sim | Default `true` |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Alteração em `gestao_leads`** (adaptação ao Modelo Canônico — ver seção 3 do ARQUITETURA-MOTOR-DE-LEADS.md):
`external_id TEXT UNIQUE` (idempotência), `source_type TEXT`, `source_form_id UUID REFERENCES gestao_leads_source_forms(id)`, `custom_fields JSONB`.

**Políticas RLS:**
- `gestao_leads_sources` / `_source_pages` / `_source_forms`: leitura e escrita restritas a role administrativa (não vinculado a `workspace_id`, então **não** segue o padrão de RLS por workspace das demais tabelas — validar mecanismo de "admin da agência" antes de implementar, ver pergunta ao final).
- `gestao_leads_form_configs` / `_form_integrations`: leitura restrita a admin + membros do `workspace_id` referenciado; escrita restrita a admin.

## 5. UI/UX e Design (Obrigatório seguir DESIGN.md)

### Tela 1 — Central de Integrações (`/central-integracoes`)
- **Cards de conexão** (um por `gestao_leads_sources`): nome, tipo de provedor (ícone), status (`Conectado` / `Token expirado` com motivo exato / `Sincronizando`), **token sempre mascarado** (ex.: `EAAB••••P9D`, nunca completo na UI), contadores de formulários/páginas/workspaces vinculados, última sincronização.
- **Ações por card:** Testar · Sincronizar (rechama `listForms`, traz formulários novos sem recriar a conexão) · Renovar token · Editar · Desconectar.
- **Wizard "Nova integração" (3 passos):**
  1. **Provedor** — escolher a plataforma (Meta Business, Google Ads/Lead Forms, Google Sheets, Kommo, Evolution API).
  2. **Autenticação** — token (System User Access Token, decidido na seção 3) → botão "Validar e Salvar" chama `validateCredentials`; mostra o motivo exato do erro inline se inválido (nunca "erro de conexão" genérico).
  3. **Árvore Business ▸ Página ▸ Formulários** — listada automaticamente via `listPages`/`listForms`; seleção por checkbox (`is_monitored`); sem input de texto em nenhum passo.

### Tela 2 — Fontes de Entrada (`/fontes-de-entrada`)
- **Tabela Formulário → Workspace:** formulários descobertos, página de origem, workspace atual, status (`Ativo` / `Pendente`).
- **Drawer de Configuração (Passo 4)**, aberto ao clicar numa linha: Workspace (select), Método de Distribuição (Round Robin / Peso / Manual), lista de Integrações a ativar (cada uma abre seu próprio form: Kommo, Sheet, Evolution, Webhook genérico) — nota fixa de que integrações são **apenas destinos**, nunca contêm regra de negócio.

**Tempo real:** status da conexão (`active`/`invalid`/`expired`) reflete via Supabase Realtime caso a validação periódica encontre um token expirado.

**Loading/Skeleton:** `listPages`/`listForms` fazem chamada de rede real à Graph API — usar `Skeleton` do shadcn/ui e estado de erro explícito (não silencioso) se a API da Meta falhar.

## 6. Integração com Inteligência Artificial

Tools em `/lib/ai/tools.ts`:
- `listConnectedSources()` / `getSourceHealth(sourceId)` — "algum token está prestes a expirar?"
- `getFormConfig(formId)` — "qual integração está ativa no formulário Black Friday?"

## 7. Critérios de Aceite

- [ ] Features isoladas em `/features/integration-hub/` e `/features/lead-sources/` (components, actions.ts, hooks.ts, README.md cada uma).
- [ ] Nenhum ID (page/form) é digitado manualmente em nenhum ponto da UI — sempre via lista descoberta pela API oficial.
- [ ] `validateCredentials` roda automaticamente ao salvar o token e bloqueia o salvamento se inválido, exibindo o motivo.
- [ ] `gestao_leads.external_id` é `UNIQUE` — reenviar o mesmo webhook não gera lead duplicado nem reexecuta integrações.
- [ ] Providers (`lib/leads/providers/*`) não contêm nenhuma regra de negócio — só tradução de API e chamadas HTTP.
- [ ] Um novo provedor (ex.: LinkedIn Lead Gen Forms) pode ser adicionado implementando `LeadSourceProvider`, sem alterar `lib/inngest/functions.ts`.
- [ ] Zero hardcode: nenhum token, page_id ou form_id fixo no código.
- [ ] Nada do que já existe (CRM, Dashboard, tabelas atuais) foi removido ou quebrado por esta mudança.

---

**Documentos relacionados:** [ARQUITETURA-MOTOR-DE-LEADS.md](ARQUITETURA-MOTOR-DE-LEADS.md) · [PRD-MODULO-LEADS.md](PRD-MODULO-LEADS.md) · [DATABASE-NAMING.md](../00%20-%20Regras/DATABASE-NAMING.md)
