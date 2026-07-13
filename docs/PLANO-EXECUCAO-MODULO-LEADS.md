# 🚀 Plano de Execução — Módulo de Distribuição de Leads

> Substituição das automações N8N (Karol Shutz, Mega Invest e futuras) por um módulo nativo
> dentro do app de Gestão de Projetos, seguindo o [RESUMO-ARCHITECTURE.md](../00%20-%20Regras/RESUMO-ARCHITECTURE.md)
> (Next.js 16 + Supabase + Feature-Sliced Design).

**Data:** 2026-07-13
**Volume alvo:** 1.000+ leads/dia (todos os clientes somados)
**Requisito central:** tempo real, sem delay, sem perda de lead.

---

## 1. Diagnóstico das automações atuais (N8N)

Análise dos workflows `[Karol Shutz]` e `[MEGA INVEST] - Automação de entrada de Clientes`:

### O fluxo real hoje

```
Meta Lead Ads → Planilha "Banco de Dados" (integração externa)
      → N8N faz POLLING na planilha (a cada 1–19 min!) ❌ não é tempo real
      → Deduplicação por e-mail na aba "CRM"
      → Rodízio: lê aba "Atualização" (status=Disponível), atualiza "ultimo lead"
      → Entrega:
          Karol → Kommo (busca contato por telefone, cria contato + lead
                  com pipeline_id/custom fields FIXOS no nó) + aba CRM
          Mega Invest → só aba CRM da planilha
      → Evolution API: mensagem ao vendedor + ao grupo
      → Marca flags "ok" nas colunas (Atualizar / Mandou msg / FOI PRO KOMMO?)
```

### Problemas identificados (por que está "dando muito problema")

| # | Problema | Evidência no workflow | Consequência |
|---|----------|----------------------|--------------|
| 1 | **Não é tempo real** | Schedule Trigger 15–19 min + Sheets Trigger polling 1–6 min | Lead chega ao vendedor com até ~20 min de atraso |
| 2 | **Planilha como banco de dados** | Todo estado vive em abas do Sheets | Race conditions, limites de quota da API do Google |
| 3 | **Rodízio não-atômico** | `Busca o da vez` → `Atualiza fila` em 2 passos separados | 2 leads simultâneos podem cair no mesmo vendedor. Com 1000/dia isso é certeza de acontecer |
| 4 | **Waits aleatórios como gambiarra** | `Code in JavaScript` sorteando delays de 1–53 min | Tentativa de evitar colisão de quota/corrida = mais atraso |
| 5 | **Lógica quadruplicada** | O mesmo ramo copiado 4x dentro de cada workflow, e 1 workflow gigante por cliente | Manutenção impossível; corrigir 1 bug exige mexer em 8 lugares |
| 6 | **Estado por flags "ok" em colunas** | `Atualizar=ok`, `Mandou mensagem no Whats=ok`, `FOI PRO KOMMO?=ok` | Sem máquina de estados real; leads "presos no meio" sem visibilidade |
| 7 | **IDs Kommo hard-coded** | `pipeline_id: 13924251`, `custom_field id: 655730...` dentro dos nós | Onboarding de cliente novo = clonar e editar workflow inteiro |
| 8 | **Normalização duplicada** | O mesmo JS de telefone (regra do 9º dígito por DDD) colado em ~10 nós | Divergência entre cópias, bugs silenciosos |
| 9 | **Sem retry estruturado** | `onError: continueRegularOutput` engole falhas | Lead falha na entrega e ninguém fica sabendo |

**Conclusão:** o problema não é o N8N em si — é a arquitetura *planilha-como-banco + polling + cópia por cliente*. A solução é mover o motor para o app com banco de verdade e webhook nativo da Meta.

---

## 2. Arquitetura alvo

### Visão geral

```
Meta Lead Ads ──(Webhook nativo do SEU App Meta, tempo real)──▶
  POST /api/webhooks/meta
      1. Valida assinatura (X-Hub-Signature-256) + responde 200 imediato
      2. Grava lead cru na tabela `leads` (status: RECEIVED)
      3. Enfileira processamento
            ▼
  Motor de distribuição (assíncrono, com retry)
      4. TRACK      → captura nativa da Graph API: campaign/adset/ad (id+nome),
                      form, is_organic, platform — trackeamento completo em TODO lead
      5. NORMALIZE  → telefone (regra 9º dígito/DDD), nome, e-mail, respostas
      6. REGISTER   → planilhamento de CONTROLE INTERNO (tabela `leads` = registro
                      mestre de todos os leads de todos os clientes; opcional:
                      espelho em planilha própria via adapter)
      7. DEDUPE     → por telefone/e-mail na base do cliente
      8. ASSIGN     → função SQL atômica: vendedor Disponível com `last_lead_at` mais antigo
      9. DELIVER    → adapter do destino do cliente (Kommo | Planilha com dados
                      completos do lead | CRM próprio futuro)
     10. NOTIFY     → Evolution API (vendedor + grupo)
     11. DONE / FAILED (com motivo, retry automático, alerta)
            ▼
  UI (features/leads) — realtime via Supabase Realtime
```

### Por que conecta nativo na Meta (sem intermediários)

- Criar um **App Meta próprio** (tipo Business) com produto **Webhooks + Lead Ads**:
  - `leadgen` webhook → a Meta faz POST no seu endpoint **no instante** em que o formulário é enviado.
  - **Facebook Login for Business** → o cliente autoriza sua app com 2 cliques; você lista as Páginas dele e assina os formulários.
  - Permissões: `leads_retrieval`, `pages_show_list`, `pages_manage_metadata`, `pages_manage_ads`.
  - Ao receber o webhook (que traz só o `leadgen_id`), buscar os dados completos via Graph API.
- Elimina: planilha intermediária, polling, integração de terceiros. **Latência: segundos.**
- Requisito: App Review da Meta para as permissões (processo padrão, ~dias). Enquanto não sai, dá pra operar em modo dev com os clientes adicionados como testers/business.

### Stack (conforme regras padrão)

- **Next.js 16 App Router** — Route Handler para o webhook, Server Actions para mutações da UI
- **Supabase Postgres** — banco, RLS multi-tenant por `organization_id`, Realtime para o log ao vivo
- **Fila/retry** — tabela `lead_jobs` + processamento com `FOR UPDATE SKIP LOCKED` (aguenta 1000+/dia com folga; ~1 lead/minuto em média, picos de dezenas/minuto)
- **Evolution API** — já instalada no servidor, usada pelos adapters de notificação

---

## 3. Modelo de dados (Supabase)

```sql
-- Clientes já existem na gestão de projetos (organizations/projects)

-- Conexão Meta por cliente
meta_connections    (id, client_id, page_id, page_name, access_token, form_ids[], status)

-- Vendedores do rodízio (espelho da planilha "Fila da Vez")
sellers             (id, client_id, name, crm_user_id,        -- ID do usuário no Kommo
                     phone, email,
                     status          -- 'available' | 'off'
                     last_lead_at,   -- timestamp do último lead recebido
                     created_at)

-- Destino de entrega por cliente (adapter plugável)
destinations        (id, client_id,
                     type            -- 'kommo' | 'sheet' | 'internal' (CRM próprio futuro)
                     config jsonb)   -- kommo: subdomain, token, pipeline_id, status_id,
                                     --        mapa de custom_fields; sheet: spreadsheet_id, aba

-- Configuração de notificação por cliente
notification_configs(id, client_id, evolution_instance, group_jid,
                     notify_seller boolean, template_group text, template_seller text)

-- O lead e sua máquina de estados
leads               (id, client_id, leadgen_id UNIQUE,        -- dedupe de webhook duplicado
                     raw jsonb,                                -- payload original da Meta
                     name, email, phone, answers jsonb,
                     utm_campaign, utm_medium, utm_content, utm_source_platform,
                     seller_id,
                     status,         -- received → normalized → assigned → delivered
                                     --   → notified → done | failed
                     error text, attempts int,
                     created_at, updated_at)

-- Trilha de auditoria
lead_events         (id, lead_id, event, detail jsonb, created_at)
```

### O coração: rodízio atômico (elimina o problema #3)

```sql
create or replace function assign_next_seller(p_client_id uuid)
returns sellers as $$
  update sellers s
  set last_lead_at = now()
  where s.id = (
    select id from sellers
    where client_id = p_client_id and status = 'available'
    order by last_lead_at asc nulls first
    for update skip locked
    limit 1
  )
  returning s.*;
$$ language sql;
```

Uma única operação: impossível dois leads pegarem o mesmo vendedor, mesmo chegando no mesmo milissegundo.

---

## 4. Estrutura de código (Feature-Sliced)

```
features/leads/
├── components/
│   ├── SellersTable.tsx        # tabela de vendedores + toggle Disponível/Off
│   ├── LeadsLog.tsx            # log realtime dos leads (status colorido)
│   ├── DestinationForm.tsx     # config Kommo/Planilha do cliente
│   └── MetaConnectCard.tsx     # conectar página do Facebook (OAuth)
├── actions.ts                  # Server Actions: toggle seller, retry lead, salvar config
├── hooks.ts                    # TanStack Query + Supabase Realtime subscription
└── README.md

lib/leads/                      # motor (sem UI)
├── normalize.ts                # PORTAR o JS do n8n: telefone 9º dígito/DDD, nome, tickets
├── assign.ts                   # chama assign_next_seller()
├── pipeline.ts                 # máquina de estados received→...→done
├── adapters/
│   ├── kommo.ts                # busca contato (últimos 8 dígitos), cria contato+lead,
│   │                           #   responsible_user_id = seller.crm_user_id, custom fields via config
│   ├── sheet.ts                # append na planilha do cliente (Google Sheets API)
│   └── internal.ts             # (futuro) seu CRM próprio
└── notify/
    └── evolution.ts            # sendText p/ vendedor e grupo, templates por cliente

app/api/webhooks/meta/route.ts  # GET (verify token) + POST (leadgen, valida assinatura)
app/api/oauth/meta/route.ts     # callback do Facebook Login for Business
```

**Reaproveitamento direto do N8N:** a lógica de normalização de telefone (DDDs com 9º dígito), capitalização de nome, classificação de ticket e o formato das mensagens WhatsApp já estão prontos nos workflows — é portar para `normalize.ts` e templates, com testes unitários.

---

## 5. Fases de execução

### ✅ Fase 0 — Fundacão (já existe)
Scaffold Next.js + Supabase criado. Confirmar auth + RLS base por `client_id`.

### Fase 1 — Banco e motor (o coração) — *começar aqui*
- [ ] Migrations: `sellers`, `destinations`, `leads`, `lead_events`, `notification_configs`, `meta_connections`
- [ ] Função `assign_next_seller()` + índices (`leads.leadgen_id unique`, `sellers(client_id, status, last_lead_at)`)
- [ ] RLS: cliente só enxerga os dados do próprio `client_id`
- [ ] `lib/leads/normalize.ts` portado do N8N + testes (telefone é o crítico)
- [ ] `lib/leads/pipeline.ts` com retry (3 tentativas, backoff) e `lead_events`

### Fase 2 — Entrada Meta nativa
- [ ] Criar App Meta (Business) + produto Webhooks/Lead Ads
- [ ] `POST /api/webhooks/meta`: validar `X-Hub-Signature-256`, dedupe por `leadgen_id`, gravar e responder 200 em <2s
- [ ] Buscar lead completo na Graph API (`/{leadgen_id}?fields=...`)
- [ ] OAuth Facebook Login for Business → salvar `meta_connections` por cliente
- [ ] Submeter App Review (`leads_retrieval` etc.) — **iniciar cedo, é o único prazo externo**

### Fase 3 — Adapters de entrega
- [ ] `kommo.ts`: config por cliente em `destinations.config` (nada hard-coded), fluxo busca-contato → cria-contato → cria-lead com `responsible_user_id` do vendedor da vez
- [ ] `sheet.ts`: append na planilha CRM do cliente (mesmas colunas de hoje, transição suave)
- [ ] Retry + status `failed` com motivo visível

### Fase 4 — Notificações
- [ ] `evolution.ts` (instância `Evan_Suporte` já existente)
- [ ] Templates por cliente (portar as mensagens atuais: "Chegou um *novo Lead* 🔥...")
- [ ] Notificar vendedor (DM) + grupo, registrar em `lead_events`

### Fase 5 — Painel na Gestão de Projetos
- [ ] Aba "Leads" na página do cliente: `SellersTable` (toggle on/off), `LeadsLog` realtime, config de destino/notificação, `MetaConnectCard`
- [ ] Ação "reprocessar lead" para os `failed`

### Fase 6 — Portal do cliente (acesso restrito)
- [ ] Login do cliente → enxerga SÓ o módulo de leads dele (RLS garante no banco)
- [ ] Ele mesmo liga/desliga vendedores e consulta telefones (autonomia que já tem hoje na planilha)

### Fase 7 — Migração (sem big bang)
1. **Shadow mode**: webhook Meta apontando para o app EM PARALELO com o N8N rodando. Comparar: todo lead do N8N apareceu no app? Vendedor da vez bateu?
2. Importar vendedores das planilhas "Fila da Vez" (com `last_lead_at` atual, pra não bagunçar o rodízio)
3. Piloto com 1 cliente (sugestão: Mega Invest — só planilha, sem Kommo, mais simples)
4. Migrar Karol Shutz (Kommo)
5. Desligar workflows N8N ✂️

---

## 6. Decisões já tomadas (para não rediscutir)

| Decisão | Valor |
|---|---|
| CRM atual dos clientes | Kommo ou Planilha; CRM próprio no futuro (adapter `internal`) |
| WhatsApp | Evolution API (já instalada no servidor) |
| Rodízio | Disponível + `last_lead_at` mais antigo, toggle on/off, atômico no banco |
| ID do vendedor | `crm_user_id` = ID do usuário no Kommo (atribuição direta) |
| Entrada de leads | Webhook nativo do App Meta próprio (sem planilha, sem polling) |
| Volume | 1.000+ leads/dia → fila em Postgres é suficiente, sem infra extra |
| Quem configura | Você (admin geral) + cliente com acesso restrito ao módulo dele |
| Planilha | Deixa de ser cérebro; vira apenas destino de entrega opcional |

---

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| App Review da Meta demora | Submeter na Fase 2 desde o início; operar em modo dev/testers enquanto isso; fallback temporário: manter entrada atual só até aprovação |
| Token de página expira | Usar long-lived token + job de renovação; alerta no painel se conexão cair |
| Kommo API rate limit | Retry com backoff (o N8N já sofria disso — os Waits de 1.2s nos nós Kommo) |
| Evolution API fora do ar | Notificação falha NÃO bloqueia entrega do lead; retry separado |
| Webhook duplicado da Meta | `leadgen_id UNIQUE` no banco (dedupe idempotente) |
| Cliente mexe errado no painel | Portal restrito: só toggle de vendedor e visualização; configs de destino só admin |
