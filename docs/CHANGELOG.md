# Diário de Bordo & Changelog do Agency OS

> Este documento serve para registrar de forma detalhada as decisões arquiteturais e configurações realizadas, para facilitar auditorias e consultas futuras (por humanos ou outras IAs).

## Fase Atual: Construção do MVP 0 (Motor de Leads)

### [2026-07-13] Setup Inicial do Repositório
- **Ação:** Criação de um novo repositório Next.js (`gestao-de-projetos`) isolado para evitar conflitos com a versão antiga do NOSSOCRM.
- **Stack:** Next.js 16 (App Router), TypeScript, TailwindCSS v4, pnpm.
- **Configuração de Pastas:** Estabelecido o modelo *Feature-Sliced Design* (`app/`, `features/`, `components/`, `lib/`).
- **Dependências Instaladas:** `@supabase/supabase-js`, `inngest`, `zod`, `lucide-react`, `clsx`, `tailwind-merge`.
- **UI:** Inicialização do `shadcn/ui` concluída com sucesso.

### [2026-07-13] Modelagem do Banco de Dados (Supabase)
- **Ação:** Inicialização do `supabase init` e criação do arquivo de migration (`supabase/migrations/20260713000000_init_agency_os.sql`).
- **Arquitetura de Dados** *(nomes atualizados em 2026-07-13, ver entrada "Convenção de Nomenclatura" abaixo)*:
  - `core_workspaces`: Estrutura base para Multi-Tenancy (Separação de clientes/agências).
  - `core_workspace_users`: Relacionamento entre usuários (`auth.users`) e clientes, com regras de permissão (`role`).
  - `gestao_leads_distribution_rules`: Configurações de distribuição (Round Robin, Pesos, etc) salvas em formato `JSONB`.
  - `gestao_leads`: Tabela principal que armazenará os leads brutos recebidos das Landing Pages/Facebook.
  - `gestao_leads_audit_logs`: Tabela de auditoria para registrar todo o ciclo de vida do lead (Recebido -> Tratado -> Distribuído).
  - **Segurança:** Configuração inicial de RLS (Row Level Security) ativada em todas as tabelas.

### [2026-07-13] PRD e Plano de Execução do Módulo de Leads
- **Ação:** Criação do [PRD-MODULO-LEADS.md](PRD-MODULO-LEADS.md) (formato PRD-TEMPLATE oficial) e do [PLANO-EXECUCAO-MODULO-LEADS.md](PLANO-EXECUCAO-MODULO-LEADS.md) a partir da análise dos workflows N8N atuais (Karol Shutz e Mega Invest).
- **Decisões-chave:**
  - Entrada de leads passa a ser **webhook nativo da Meta** (App Meta próprio, `leadgen`), substituindo a integração Meta→planilha + polling do N8N.
  - Rodízio de vendedores via função SQL atômica `assign_next_seller()` (`FOR UPDATE SKIP LOCKED`).
  - Pipeline assíncrono via **Inngest** (já configurado): track → normalize → register → dedupe → assign → deliver → notify.
  - Novas tabelas planejadas: `gestao_leads_sellers`, `gestao_leads_destinations`, `gestao_leads_meta_connections`, `gestao_leads_notification_configs`; extensão da tabela `gestao_leads` (leadgen_id UNIQUE, trackeamento, seller_id).
  - Entrega por adapter plugável: Kommo | Planilha | `internal` (futuro CRM próprio).
  - Notificações via Evolution API (instância existente no servidor).
  - Migração em shadow mode: piloto Mega Invest (planilha) → Karol Shutz (Kommo) → desligar N8N.

### [2026-07-13] Convenção de Nomenclatura de Tabelas (Multi-App)
- **Ação:** Criação da regra [DATABASE-NAMING.md](../00%20-%20Regras/DATABASE-NAMING.md) em `00 - Regras/`, adicionada à leitura obrigatória em `COMO-USAR.txt`.
- **Motivo:** o projeto Supabase é **compartilhado entre todos os apps** da pasta `00 - Apps/` (Gestão, Jurídico, futuros) — sem prefixo, nomes de tabela colidiriam ou ficariam impossíveis de identificar.
- **Padrão:** `{app}_{modulo}_{entidade}` em snake_case · exceção 1: tabela central do módulo usa `{app}_{modulo}` sem repetir o nome · exceção 2: tabelas de plataforma (tenant/usuário) usam `core_{entidade}`, sem prefixo de app.
- **Renomeação aplicada** (migration ainda não deployada em nenhum ambiente — editada in-place, sem migration de rename):
  | Antigo | Novo |
  |---|---|
  | `workspaces` | `core_workspaces` |
  | `workspace_users` | `core_workspace_users` |
  | `leads` | `gestao_leads` |
  | `lead_audit_logs` | `gestao_leads_audit_logs` |
  | `lead_distribution_rules` | `gestao_leads_distribution_rules` |
- **Arquivos atualizados:** `supabase/migrations/20260713000000_init_agency_os.sql`, `lib/inngest/functions.ts` (comentários), `docs/PRD-MODULO-LEADS.md` (nomes das tabelas do módulo de leads já nascem no padrão novo: `gestao_leads_sellers`, `gestao_leads_destinations`, `gestao_leads_meta_connections`, `gestao_leads_notification_configs`).

### [2026-07-13] Setup do Inngest (Filas Assíncronas)
- **Ação:** Configuração do Inngest para lidar com webhooks e processamento assíncrono em plano de fundo sem derrubar a API do Next.js.
- **Arquivos Criados:**
  - `lib/inngest/client.ts`: Inicialização do cliente Inngest com Eventos Tipados.
  - `lib/inngest/functions.ts`: Definição das funções assíncronas (ex: `processNewLead`).
  - `app/api/inngest/route.ts`: Endpoint obrigatório que o painel do Inngest vai "escutar" para disparar os webhooks.
