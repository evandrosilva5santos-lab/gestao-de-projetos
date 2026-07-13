# 📋 PRD: Módulo de Distribuição de Leads (Lead Hub)

## 1. Visão Geral
**Status:** Aprovado
**Objetivo Principal:** Receber leads do Meta Lead Ads **nativamente via webhook (tempo real)**, rastrear a origem (campanha/conjunto/anúncio), registrar tudo para controle interno do admin, distribuir ao "vendedor da vez" de forma **atômica**, entregar no destino de cada cliente (Kommo ou Planilha; futuramente o CRM próprio) e notificar via WhatsApp (Evolution API) — tudo em segundos.

**Problema que resolve:** hoje a Meta é conectada a uma planilha Google e workflows N8N fazem *polling* (delay de até ~20 min), com rodízio não-atômico (dois leads simultâneos podem cair no mesmo vendedor), lógica quadruplicada por cliente, IDs do Kommo hard-coded nos nós e falhas silenciosas. Volume: **1.000+ leads/dia** somando os clientes — a arquitetura atual não sustenta. Diagnóstico completo dos workflows N8N: [PLANO-EXECUCAO-MODULO-LEADS.md](PLANO-EXECUCAO-MODULO-LEADS.md).

**Fluxo em uma linha:**
```
Meta (webhook leadgen) → TRACK → NORMALIZE → REGISTER (controle) → DEDUPE
  → ASSIGN (rodízio atômico) → DELIVER (Kommo | Planilha) → NOTIFY (WhatsApp) → DONE
```

## 2. Casos de Uso (User Stories)

**Admin (Evan):**
- Como Admin, eu quero conectar a página do Facebook de um cliente via OAuth (2 cliques) para que os leads cheguem direto no sistema, sem planilha intermediária e sem polling.
- Como Admin, eu quero ver TODOS os leads de todos os clientes com trackeamento (campanha/conjunto/anúncio/plataforma) e status de processamento — este é o meu **planilhamento de controle**.
- Como Admin, eu quero configurar o destino de entrega por cliente (Kommo ou Planilha) **sem tocar em código**, para fazer onboarding de cliente novo em menos de 30 minutos.
- Como Admin, eu quero ver leads que falharam com o motivo exato e reprocessá-los com um clique, para nunca perder um lead.
- Como Admin, eu quero ser alertado quando não houver nenhum vendedor disponível no rodízio de um cliente, para agir antes de acumular leads parados.

**Cliente (dono da empresa anunciante):**
- Como Cliente, eu quero ligar/desligar vendedores do rodízio e consultar seus telefones, para gerenciar minha equipe com a mesma autonomia que tenho hoje na planilha.
- Como Cliente, eu quero ver os leads do meu projeto chegando em tempo real, para acompanhar minhas campanhas.

**Vendedor (sem acesso ao sistema):**
- Como Vendedor, eu quero receber o lead já atribuído a mim no CRM/planilha e uma mensagem no meu WhatsApp com os dados completos, para atender em segundos.

## 3. Requisitos Arquiteturais (Obrigatório seguir ARCHITECTURE.md)

**Caminho da Feature:** `/features/leads`

**Rotas Envolvidas:**
- `/app/(protected)/clientes/[id]/leads` — aba Leads na página do workspace/cliente (admin)
- `/app/(protected)/portal/leads` — portal restrito do cliente
- `/app/api/webhooks/meta` — webhook `leadgen` da Meta (GET verify token + POST; valida `X-Hub-Signature-256`; responde 200 em <2s e delega o processamento ao Inngest)
- `/app/api/oauth/meta` — callback do Facebook Login for Business
- `/app/api/inngest` — endpoint do Inngest (**já criado no setup**)

**Processamento assíncrono — Inngest (já instalado no projeto):**
- Evento tipado `lead/received` disparado pelo webhook → função `processNewLead` executa o pipeline com **retry automático e step-by-step durável** (cada etapa — track, normalize, assign, deliver, notify — é um `step.run` independente: se a entrega no Kommo falhar, o Inngest re-executa SÓ essa etapa).
- Isso resolve o requisito de "responder à Meta em <2s" e absorve picos de campanha sem derrubar a API.

**Motor (sem UI) em `/lib/leads/`:**
- `normalize.ts` — telefone (regra do 9º dígito por DDD, prefixo 55, remoção de `p:`/`+`/`00`), nome com partículas, e-mail lowercase — **portado do N8N com testes unitários** (é a lógica mais validada em produção que já existe)
- `tracking.ts` — extração de `campaign/adset/ad/form/platform/is_organic` da Graph API
- `assign.ts` — chamada da função SQL `assign_next_seller()`
- `adapters/kommo.ts` · `adapters/sheet.ts` · `adapters/internal.ts` (futuro CRM próprio)
- `notify/evolution.ts` — mensagens ao vendedor e ao grupo

**Integração Meta (App próprio, tipo Business):**
- Produtos: Webhooks (`leadgen`) + Facebook Login for Business.
- Permissões: `leads_retrieval`, `pages_show_list`, `pages_manage_metadata`, `pages_manage_ads`.
- ⚠️ **App Review é a única dependência externa com prazo** → submeter no início. Enquanto pendente: operar em modo dev com os negócios dos clientes como testers.
- Long-lived page token + job de renovação + alerta no painel se a conexão cair.

**Mutações:** Server Actions em `features/leads/actions.ts` consumidas via TanStack Query (`features/leads/hooks.ts`).

## 4. Banco de Dados e Supabase (Esquema)

*Base já existente na migration `20260713000000_init_agency_os.sql`: `core_workspaces`, `core_workspace_users`, `gestao_leads_distribution_rules`, `gestao_leads`, `gestao_leads_audit_logs` (RLS ativado). Nomenclatura segue [DATABASE-NAMING.md](../00%20-%20Regras/DATABASE-NAMING.md) — projeto Supabase compartilhado entre todos os apps. Multi-tenancy por `workspace_id`.*

### 4.1 Tabelas NOVAS

**Tabela: `gestao_leads_sellers`** (fila da vez — vendedores não têm login; são registros do workspace)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK, default `gen_random_uuid()` |
| `workspace_id` | UUID | Sim | FK para `core_workspaces.id` |
| `name` | Text | Sim | Nome do consultor |
| `crm_user_id` | Text | Não | ID do usuário no Kommo (atribuição direta do lead) |
| `phone` | Text | Não | WhatsApp do vendedor (formato 55DDDNÚMERO) |
| `email` | Text | Não | E-mail |
| `status` | Text | Sim | `available` / `off` (default `available`) |
| `last_lead_at` | Timestamptz | Não | Último lead recebido — ordena o rodízio |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Tabela: `gestao_leads_destinations`** (adapter de entrega por workspace)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `workspace_id` | UUID | Sim | FK para `core_workspaces.id` |
| `type` | Text | Sim | `kommo` / `sheet` / `internal` |
| `config` | JSONB | Sim | **kommo:** subdomain, long_lived_token, pipeline_id, status_id, tag_id, mapa de custom_fields (telefone, e-mail, UTMs, respostas). **sheet:** spreadsheet_id, aba, mapa de colunas |
| `is_active` | Boolean | Sim | Default `true` |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Tabela: `gestao_leads_meta_connections`** (conexão com a página do Facebook)
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `workspace_id` | UUID | Sim | FK para `core_workspaces.id` |
| `page_id` / `page_name` | Text | Sim | Página conectada |
| `access_token` | Text | Sim | Long-lived page token (cifrado; nunca exposto ao client) |
| `form_ids` | Text[] | Não | Formulários assinados (vazio = todos) |
| `status` | Text | Sim | `active` / `expired` / `error` |
| `created_at` | Timestamptz | Sim | Default `now()` |

**Tabela: `gestao_leads_notification_configs`**
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK |
| `workspace_id` | UUID | Sim | FK para `core_workspaces.id` |
| `evolution_instance` | Text | Sim | Instância Evolution (ex: `Evan_Suporte`) |
| `group_jid` | Text | Não | Grupo WhatsApp do cliente (ex: `1203...@g.us`) |
| `notify_seller` | Boolean | Sim | Enviar DM ao vendedor da vez (default `true`) |
| `template_group` / `template_seller` | Text | Não | Templates com placeholders `{{nome}}`, `{{telefone}}`, `{{campanha}}`... (portar mensagens atuais do N8N) |
| `created_at` | Timestamptz | Sim | Default `now()` |

### 4.2 Alterações em tabelas EXISTENTES

**`gestao_leads` — adicionar colunas:**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `leadgen_id` | Text **UNIQUE** | ID do lead na Meta — dedupe idempotente de webhook duplicado |
| `answers` | JSONB | Respostas do formulário |
| `campaign_id/name`, `adset_id/name`, `ad_id/name`, `form_id/name` | Text | **Trackeamento nativo** |
| `platform` | Text | `facebook` / `instagram` |
| `is_organic` | Boolean | Lead pago ou orgânico |
| `seller_id` | UUID FK `gestao_leads_sellers.id` | Vendedor da vez (substitui uso de `assigned_to` para vendedores sem login) |
| `error` | Text | Motivo da última falha |
| `attempts` | Int | Tentativas de processamento |

**`gestao_leads.status` — máquina de estados:**
`received → normalized → assigned → delivered → notified → done | failed | waiting_seller`

**`gestao_leads_audit_logs`** — já cobre a trilha de auditoria (action: received, tracked, normalized, assigned, delivered, notified, error, retried).

**`gestao_leads_distribution_rules`** — usada para regras do rodízio (`rule_type: 'round_robin'` hoje; pesos/horário no futuro, sem migração).

### 4.3 Função crítica — rodízio atômico

```sql
create or replace function assign_next_seller(p_workspace_id uuid)
returns gestao_leads_sellers as $$
  update gestao_leads_sellers s set last_lead_at = now()
  where s.id = (
    select id from gestao_leads_sellers
    where workspace_id = p_workspace_id and status = 'available'
    order by last_lead_at asc nulls first
    for update skip locked
    limit 1
  )
  returning s.*;
$$ language sql;
```
Uma única operação: **impossível** dois leads simultâneos pegarem o mesmo vendedor (elimina o principal bug do N8N).

**Índices:** `gestao_leads(leadgen_id) unique` · `gestao_leads(workspace_id, status, created_at)` · `gestao_leads_sellers(workspace_id, status, last_lead_at)`.

### 4.4 Políticas RLS (Row Level Security)
- Leitura/Escrita: usuários apenas onde `workspace_id` ∈ workspaces do seu `auth.jwt()` (via `core_workspace_users`).
- Role `member` (cliente): leitura de `gestao_leads`; em `gestao_leads_sellers` apenas leitura + update do campo `status`; **sem acesso** a `gestao_leads_destinations`, `gestao_leads_meta_connections`, `gestao_leads_notification_configs`.
- Role `admin`: acesso total aos workspaces que administra.
- Webhook/Inngest: service role (server-side apenas; nunca exposto).

## 5. UI/UX e Design (Obrigatório seguir DESIGN.md)

**Aba "Leads" na página do cliente (admin):**
| Componente | Descrição |
|---|---|
| `MetaConnectCard` | Status da conexão (ativa/expirada) + botão "Conectar página do Facebook" (OAuth) + formulários assinados |
| `SellersTable` | Vendedores: nome, ID Kommo, telefone, último lead, **switch Disponível/Off** com optimistic update |
| `LeadsLog` | Leads com **badge de status colorido**, colunas nome/telefone/campanha/anúncio/vendedor/data; filtros por período, campanha e status; botão **Reprocessar** nos `failed` |
| `DestinationForm` | Drawer de configuração do destino (Kommo: credenciais + mapa de campos; Sheet: planilha + colunas) com botão "Testar conexão" |
| `NotificationForm` | Grupo WhatsApp, templates, toggle de DM ao vendedor, botão "Enviar teste" |

**Portal do cliente:** mesma base, restrita — `SellersTable` (só toggle) + `LeadsLog` (só leitura). Sem configurações.

**Tempo real:** SIM — `LeadsLog` e `SellersTable` assinam **Supabase Realtime** (canal por `workspace_id`); lead novo aparece na tela no instante em que chega. Banner de alerta quando `waiting_seller > 0` ou conexão Meta expirada.

**Loading/Skeleton:** TanStack Query com `Skeleton` do shadcn/ui nas tabelas; estados vazios com CTA ("Nenhum vendedor — adicionar"); toasts nas mutações; dark mode obrigatório.

## 6. Integração com Inteligência Artificial

Tools no Vercel AI SDK em `/lib/ai/tools.ts`:
- `getLeadsSummary(workspaceId, period)` — "quantos leads a Karol recebeu hoje e de quais campanhas?"
- `getCampaignPerformance(workspaceId)` — ranking campanha/conjunto/anúncio por volume (usa o trackeamento nativo)
- `getFailedLeads(workspaceId)` + `retryLead(leadId)` — diagnóstico e correção por chat
- `toggleSeller(sellerId, status)` — "coloca o Henrique como disponível"
- `getRoundRobinStatus(workspaceId)` — quem é o próximo da fila e quem está off
- **Futuro:** qualificação/scoring automático do lead pelas respostas do formulário antes da entrega (ex: priorizar Alto Ticket).

## 7. Regras de Negócio e Casos de Borda

| Situação | Comportamento |
|---|---|
| Webhook duplicado da Meta | Ignorado silenciosamente (`leadgen_id` UNIQUE) |
| **Nenhum vendedor disponível** | Lead fica `waiting_seller`; ao religar um vendedor, fila é drenada na ordem de chegada; alerta ao admin + aviso no grupo |
| Contato já existe no Kommo (busca por últimos 8 dígitos) | Não duplica contato: cria novo lead vinculado ao contato existente (comportamento atual do N8N preservado) |
| Falha na entrega (Kommo/Sheet fora do ar) | Retry automático via Inngest (backoff exponencial); após esgotar → `failed` com motivo + alerta |
| Falha só na notificação | **Não bloqueia** a entrega; retry separado; lead segue `done` com evento de notificação pendente |
| Telefone inválido/vazio | Lead entregue mesmo assim (marcado `phone: null`); nunca descartar lead |
| Token da página expirado | `meta_connections.status = expired`, alerta no painel; leads do período recuperáveis via Graph API (janela de 90 dias) |
| Cliente sem destino configurado | Lead registrado + notificado; entrega fica pendente até configurar (nada se perde) |

## 8. Critérios de Aceite

- [ ] Feature isolada em `/features/leads/` (components, actions.ts, hooks.ts, README.md preenchido via FEATURE-README-TEMPLATE.md).
- [ ] RLS por `workspace_id` em TODAS as tabelas novas; políticas de role `member` restritas conforme seção 4.4.
- [ ] **Zero hardcode**: pipeline_id, custom fields, tokens, group_jid, templates → tudo em `gestao_leads_destinations.config` / `gestao_leads_notification_configs` no banco.
- [ ] Webhook responde 200 em <2s, valida assinatura e delega ao Inngest.
- [ ] Dedupe: reenviar o mesmo webhook 10x gera exatamente 1 lead.
- [ ] Rodízio atômico: teste de carga com leads simultâneos nunca atribui o mesmo vendedor 2x seguidas indevidamente.
- [ ] Latência ponta-a-ponta (form → WhatsApp) < 30s no caminho feliz (alvo < 10s).
- [ ] `waiting_seller` drena automaticamente ao religar vendedor.
- [ ] Lead `failed` visível com motivo e reprocessável pelo painel.
- [ ] Cliente logado enxerga apenas o próprio workspace (validado por RLS, não só por UI).
- [ ] Normalização de telefone com testes unitários cobrindo DDDs com/sem 9º dígito.
- [ ] Dark mode funcionando em todas as telas do módulo.

## 9. Lançamento e Migração (sem big bang)

1. **Shadow mode:** webhook nativo rodando em paralelo com o N8N; comparação diária (mesmos leads? mesmo vendedor da vez?).
2. **Piloto:** Mega Invest (destino planilha — mais simples).
3. **Migração:** Karol Shutz (destino Kommo). Importar vendedores das planilhas "Fila da Vez" **com o `last_lead_at` atual** para não bagunçar o rodízio.
4. **Cutover:** desligar workflows N8N; a integração Meta→planilha deixa de ser a entrada.

**Métricas de sucesso:** 95% dos leads em <30s · 0 leads perdidos · <1% `failed` sem reprocesso no dia · onboarding de cliente novo <30 min · N8N desligado.

---

**Documentos relacionados:** [PLANO-EXECUCAO-MODULO-LEADS.md](PLANO-EXECUCAO-MODULO-LEADS.md) (diagnóstico N8N, fases, riscos) · [CHANGELOG.md](CHANGELOG.md) · [RULES.md](../00%20-%20Regras/RULES.md) · [ARCHITECTURE.md](../00%20-%20Regras/ARCHITECTURE.md) · [DESIGN.md](../00%20-%20Regras/DESIGN.md)
