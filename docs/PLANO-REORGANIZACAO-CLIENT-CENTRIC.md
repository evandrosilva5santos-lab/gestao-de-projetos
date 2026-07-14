# 🧭 Plano de Reorganização — Navegação Client-Centric

**Data:** 2026-07-14
**Motivo:** separação de domínio confirmada pelo dono — **StartCRM** = comercial da agência (vender a agência); **Gestão de Projetos** (este app) = entrega/operação para os clientes da agência. A **rodada da vez** é entrega, não venda → pertence a este app. Ver memória `project_dominio_client_centric`.

**Princípio:** o substantivo central é o **Cliente/Projeto** (`workspace`), não "Integração". Tudo é escopado por cliente — o banco já faz isso (`isolate_sellers_by_connection`, RPC `assign_next_seller_for_connection`). A navegação passa a tornar visível esse isolamento.

**Restrição de esforço:** este app será absorvido pelo StartCRM num painel único no futuro → telas são descartáveis; investir em **fronteira portável** (`lib/leads/providers` + `lib/leads/integrations` + Server Actions), não em casca.

---

## 1. Navegação atual (por função) — o que sai

`features/leads/components/LeadsDashboardShell.tsx` hoje tem 3 grupos:
- **MOTOR DE LEADS:** Motor de Processamento · Fontes de Entrada · Central de Integrações
- **PRINCIPAL:** Dashboard Motor · CRM & Funil · Clientes (Workspaces) · Regras de Roteamento
- **OPERAÇÃO:** Vendedores & Rodada · Logs & Automação · Configurações

Problemas:
- `CRM & Funil` → conceito do StartCRM, não deste app. **Remover daqui.**
- `Vendedores & Rodada`, `Fontes de Entrada`, `Regras`, `Central` são **por função** — mas cada um só faz sentido no contexto de UM cliente. Hoje forçam um seletor de cliente implícito ou dados globais.
- 7 dos 10 itens são `ComingSoonPanel` (casca vazia).

## 2. Navegação alvo (client-centric)

```
Gestão de Projetos
│
├── Clientes                       ← TELA INICIAL: lista de clientes (workspaces)
│                                     cada card: nome, nº fontes, nº vendedores, leads hoje, status
│   │
│   └── [Cliente selecionado]      ← ao entrar, abas do cliente:
│        ├── Visão Geral           → leads recebidos, quem é a vez agora
│        ├── Fontes de Entrada     → páginas/formulários Meta deste cliente (conectar página)
│        ├── Fila da Vez           → vendedores + rodada + toggle ativar/pausar  ★ round robin
│        ├── Destinos              → Kommo / Sheets / WhatsApp deste cliente
│        └── Leads & Logs          → histórico, auditoria, reprocessar falhas
│
├── Integrações (agência)          ← cofre de credenciais NÍVEL-SISTEMA compartilhadas
│                                     (ex.: token Meta system-user usado por N clientes)
│
└── Configurações                  ← config global do app (mínima)
```

Regra: **entra-se pelo Cliente**. O contexto do cliente fica fixo (breadcrumb/header) e as abas operam sempre sobre ele — nunca se escolhe cliente no meio de um wizard.

## 3. Mapa atual → alvo

| Componente hoje | Vira | Ação |
|---|---|---|
| `LeadsDashboardShell` nav (3 grupos por função) | nav de 2 níveis: lista de Clientes → abas do cliente | reescrever nav; manter tema/topbar |
| `OverviewTab` | aba "Visão Geral" **do cliente** (filtrada por workspace) | ligar a dados reais por `workspace_id` |
| `SellersQueueTab` | aba "Fila da Vez" **do cliente** | ligar a `gestao_leads_sellers` do workspace + toggle via Server Action |
| `MetaConnectionsTab` | aba "Fontes de Entrada" **do cliente** | reaproveitar o fluxo Meta já feito, com cliente já no contexto |
| `IntegrationHubTab` (Central de Integrações) | "Integrações (agência)" — só credenciais compartilhadas | manter só o que é nível-sistema (token Meta); Kommo/Sheets/Evolution migram p/ "Destinos" do cliente |
| `CRM & Funil` | — | **remover** (é StartCRM) |
| `Regras de Roteamento` | dobrar dentro de "Fila da Vez" ou "Fontes" | não é tela própria |
| `ComingSoonPanel` (motor/logs/etc.) | — | remover os que não têm papel; "Leads & Logs" absorve logs |

## 4. Ajuste no fluxo Meta já construído

O wizard atual (`NewIntegrationModal`) faz token → página → **escolher cliente** → vendedores. Está correto na lógica, mas entra pela porta errada (Central de Integrações, visão por função).

No modelo client-centric: **Cliente → Fontes de Entrada → "Conectar página"** — o cliente já está no contexto, some o passo "escolher cliente" do meio do wizard. O token Meta (nível-agência) continua vindo de "Integrações (agência)"; aqui só se escolhe QUAL página daquele token pertence a este cliente.

## 5. Fases (não-quebrar o que funciona da Karol)

### Fase A — Fundação da navegação (sem tocar em dados)
- [ ] Nova `ClientsListScreen` (lista de `core_workspaces` via Server Action) como tela inicial.
- [ ] `ClientWorkspaceShell` com as 5 abas do cliente, recebendo `workspaceId` no contexto.
- [ ] `LeadsDashboardShell` vira roteador: lista de clientes ↔ shell do cliente.
- [ ] Remover itens de nav que não têm papel (CRM & Funil, coming-soons órfãos).

### Fase B — Ligar as abas do cliente aos dados reais (por `workspace_id`)
- [ ] "Fila da Vez": ler `gestao_leads_sellers` do workspace + toggle ativar/pausar (Server Action).
- [ ] "Fontes de Entrada": listar conexões Meta do workspace; "Conectar página" reusa o fluxo Meta sem o passo de escolher cliente.
- [ ] "Visão Geral" / "Leads & Logs": ler `gestao_leads` + `gestao_leads_audit_logs` do workspace.

### Fase C — Consolidar Destinos e Integrações-agência
- [ ] "Destinos" do cliente: Kommo/Sheets/Evolution por `workspace_id` (Server Actions já existem em `integration-hub/actions.ts`).
- [ ] "Integrações (agência)": só credenciais nível-sistema (token Meta compartilhado).
- [ ] Decidir schema: convergir `gestao_leads_destinations` ↔ modelo `_sources/_form_configs` do PRD (ver `PRD-FONTES-DE-ENTRADA.md`) — **pré-requisito: PRD aprovado (Regra de Ouro #1)**.

## 6. O que NÃO fazer

- Não construir shell de Configurações estilo StartCRM (7 abas) — trabalho descartável.
- Não copiar a IA do StartCRM (é single-org; aqui é multi-cliente).
- Não deixar "CRM & Funil" — é o outro produto.
- Não escolher cliente no meio de wizards — cliente é contexto, não parâmetro.

## 7. Bloqueio atual

A Fase C depende de decidir o schema (dois modelos concorrentes hoje). Isso exige o `PRD-FONTES-DE-ENTRADA.md` aprovado antes de reestruturar tabelas. Fases A e B **não** dependem disso e podem começar já.
