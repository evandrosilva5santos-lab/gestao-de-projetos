# Diário de Bordo & Changelog do Agency OS

> Este documento serve para registrar de forma detalhada as decisões arquiteturais e configurações realizadas, para facilitar auditorias e consultas futuras (por humanos ou outras IAs).

## Fase Atual: Construção do MVP 0 (Motor de Leads)

### [2026-07-13] Revisão Estratégica: Motor de Leads como núcleo (não o CRM)
- **Motivo:** direcionamento explícito do product owner — o CRM/Dashboard/Regras de Roteamento construídos até aqui **permanecem intactos** (nada removido ou refatorado), mas deixam de ser o produto: passam a ser consumidores de um **Motor de Leads** central, único, multi-origem.
- **Decisões-chave:**
  - Pipeline único obrigatório de 14 estágios (Origem → Webhook → Ingest → Normalização → Identificação Workspace/Cliente/Formulário → Regras → Validação → Rodízio → Persistência → Integrações → Logs → Finalização) — sem fluxos paralelos por provedor (Meta ≠ Google no código, apenas na origem).
  - Camada obrigatória de **Providers** (entrada: `lib/leads/providers/{meta,google}/`) e **Integrations** (saída: `lib/leads/integrations/{kommo,sheet,evolution,webhook}/`), cada uma implementando uma interface comum (`LeadSourceProvider` / `LeadIntegration`) — nenhuma contém regra de negócio; adicionar um provedor novo nunca altera o Motor.
  - **Idempotência obrigatória**: `gestao_leads.external_id UNIQUE` (Lead ID da origem) verificado antes de qualquer processamento — elimina duplicidade de mensagem/CRM/planilha/distribuição.
  - **Modelo Canônico de Lead**: após o Ingest, o Motor nunca mais sabe se o lead veio da Meta ou do Google.
  - **Rodízio transacional**: já satisfeito pela função `assign_next_seller()` existente (`FOR UPDATE SKIP LOCKED`) — reaproveitada, não recriada.
  - **Google Sheets confirmado como destino, nunca banco** — falha na planilha não bloqueia distribuição/notificação/CRM.
  - **Primeiro módulo a desenvolver: Fontes de Entrada** — conectar Meta Business via token (System User Access- **Token da página expirado:** `meta_connections.status = expired`, alerta no painel; leads do período recuperáveis via Graph API (janela de 90 dias).

### [2026-07-13] Correção Estratégica: Isolamento de Rodada por Cliente (Conexão Meta)
- **Motivo:** Identificado que vendedores estavam sendo agrupados no workspace globalmente. Na agência, cada cliente (conexão Meta) deve possuir seus próprios vendedores específicos e sua rodada da vez independente.
- **Novas Tabelas SQL:** Criada a migration `20260713000300_create_sellers_and_links.sql` para suportar:
  * `gestao_leads_sellers`: Tabela própria para consultores/vendedores que não necessariamente têm login (nome, telefone, is_active, last_assigned_at).
  * `gestao_leads_seller_connections`: Tabela de associação N:N ligando vendedores especificamente a determinadas conexões Meta (páginas).
- **Roteamento Inteligente:** Ajustada a função do Inngest (`lib/inngest/functions.ts`) para realizar o Round Robin especificamente nos vendedores pareados com a conexão geradora do lead (via `gestao_leads_seller_connections`).
- **Webhook Desafio GET:** Implementado o tratamento obrigatório do GET do Facebook (`hub.challenge`) no endpoint `/api/webhooks/leads/route.ts` para autorizar a conexão de novos webhooks nativos da Meta.
- **Primeiro módulo a desenvolver: Fontes de Entrada** — conectar Meta Business via token (System User Access Token recomendado), descoberta automática de páginas e formulários via Graph API (zero cadastro manual de ID), configuração por formulário (workspace, distribuição, integrações). Mesmo fluxo para Google Lead Forms.
- **Documentos criados:**
  - [ARQUITETURA-MOTOR-DE-LEADS.md](ARQUITETURA-MOTOR-DE-LEADS.md) — doc mestre: pipeline, contratos de Provider/Integration, idempotência, mapeamento do que já existe para o novo papel.
  - [PRD-FONTES-DE-ENTRADA.md](PRD-FONTES-DE-ENTRADA.md) — PRD do primeiro módulo (Golden Rule #1: aguardando aprovação antes de codar).
- **Documentos atualizados:** `PRD-MODULO-LEADS.md` (nota de revisão + pipeline de 14 estágios), `PLANO-EXECUCAO-MODULO-LEADS.md` (fases reordenadas: Fase 1 banco/motor já implementado ✅, Fase 2 vira Fontes de Entrada, Fase 3 vira camada de Integrations).
- **Nenhum código foi alterado nesta entrada** — apenas documentação, conforme instrução explícita de não remover/refatorar o que já existe sem PRD aprovado.

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

### [2026-07-13] Implementação do Motor de Distribuição (Round Robin) & Integração N8N (WhatsApp)
> ⚠️ Esta implementação inicial tinha 3 desvios de arquitetura (rodízio não-atômico, tabelas erradas). Ver correção na entrada seguinte "Correção de Arquitetura" — a versão vigente do código já reflete a correção.
- **Ação:** Implementação no backend da inteligência de normalização de dados, deduplicação (re-roteamento) e Round Robin, baseada na análise 1-para-1 do workflow N8N Karol Shutz.
- **Normalização de Dados:** Escrita de helper no backend para limpar números de telefone brasileiros, remover/adicionar o nono dígito (com base nos DDDs que exigem) e abreviação de nome de vendedor.
- **Lógica Round Robin (Vendedor da Vez):** Implementada a distribuição stateless consultando `core_workspace_users` ordenados por `last_assigned_at` em ordem ascendente (o vendedor que não recebe leads há mais tempo é escolhido), e atualizando o carimbo de data/hora logo após a designação.
- **WhatsApp Integrado (Evolution API):** Disparo nativo de requisições POST para a Evolution API em segundo plano. Suporta notificação direta para o telefone do vendedor designado e também para o grupo de WhatsApp cadastrado na configuração do Workspace.
- **Nova Migration:** Criado o script `supabase/migrations/20260713000100_add_sales_and_whatsapp_fields.sql` para suportar o vendedor da vez (`last_assigned_at`, `name`, `phone`, `is_active`) e a configuração do WhatsApp (`whatsapp_config` JSONB).
- **TypeScript & Build:** Correção de tipos da versão v4 do SDK do Inngest (`triggers` encapsulado no objeto de opções de `createFunction`), remoção do bloqueio de build quando variáveis de ambiente do Supabase estão vazias em tempo de build estático.

### [2026-07-13] Correção de Arquitetura: Rodízio Atômico + Separação de Tabelas + Feature-Sliced Design
- **Motivo:** revisão contra o PRD/DATABASE-NAMING encontrou 3 desvios na implementação da entrada anterior. Corrigidos antes de conectar um projeto Supabase real, para não migrar dado com o esquema errado.
- **🔴 Crítico — Rodízio não era atômico:** a distribuição fazia `SELECT` do vendedor seguido de `UPDATE` em duas operações separadas — reintroduzia exatamente a condição de corrida (bug #3) diagnosticada nos workflows N8N originais. **Corrigido:** rodízio agora é uma única chamada RPC à função SQL `assign_next_seller(p_workspace_id)`, que faz `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED)` em uma operação atômica. Função é `RETURNS SETOF` (não escalar) para não lançar erro quando não há vendedor disponível — esse caso agora gera `status = 'waiting_seller'` em vez de `'error'`.
- **🟡 Vendedores estavam em `core_workspace_users`:** essa tabela é `core_*` (login/acesso à plataforma, compartilhada entre todos os apps de `00 - Apps/`). Vendedores do rodízio não têm login (mesmo modelo da planilha "Fila da Vez" original). **Corrigido:** nova tabela `gestao_leads_sellers` (name, crm_user_id, phone, email, is_active, last_assigned_at), coluna `gestao_leads.seller_id` (substituiu `assigned_to`) referenciando essa tabela.
- **🟡 `whatsapp_config` estava direto em `core_workspaces`:** vazava configuração específica do módulo Leads para dentro da tabela de tenant compartilhada. **Corrigido:** nova tabela `gestao_leads_notification_configs` (evolution_url, evolution_instance, evolution_token, group_jid, notify_seller).
- **🟡 UI 100% em `app/page.tsx`:** violava a regra de ouro de Feature-Sliced Design (`RULES.md` #2/#4). **Corrigido:** componentes movidos para `features/leads/components/` (`LeadsDashboardShell`, `OverviewTab`, `MetaConnectionsTab`, `SellersQueueTab`, `FacebookIcon`); `app/page.tsx` virou wrapper fino. Criado `features/leads/README.md` conforme `FEATURE-README-TEMPLATE.md`. UI segue com dados mock (`useState`) — ligação real com Supabase/TanStack Query fica para a Fase 5 do plano de execução.
- **Arquivos alterados:** `supabase/migrations/20260713000100_add_sales_and_whatsapp_fields.sql` (reescrita), `lib/inngest/functions.ts` (reescrito para usar `gestao_leads_sellers`, `gestao_leads_notification_configs` e a RPC atômica), `app/page.tsx`, `features/leads/components/*` (novos), `features/leads/README.md` (novo).
- **Validação:** `pnpm build` — 0 erros de TypeScript, build estático concluído.

