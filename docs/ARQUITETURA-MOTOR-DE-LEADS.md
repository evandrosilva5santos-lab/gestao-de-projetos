# 🧠 Arquitetura: Motor de Leads (Lead Processing Engine)

**Status:** Norte estratégico da plataforma — aprovado
**Substitui a moldura mental anterior:** o CRM deixa de ser o produto. O produto é a infraestrutura de processamento de leads; o CRM é um dos seus consumidores.

## 0. O que NÃO muda (nada é removido)

Tudo que já existe permanece e passa a ser **alimentado pelo Motor**, não substituído por ele:
- CRM, `core_workspaces`, Dashboard (`features/leads/components/*`), Regras de Roteamento, Logs/Auditoria (`gestao_leads_audit_logs`), toda a estrutura visual.
- `gestao_leads` continua a tabela central do lead.
- `gestao_leads_sellers` + `assign_next_seller()` (função SQL atômica com `FOR UPDATE SKIP LOCKED`) **já implementam** a "Rodada da Vez transacional" pedida — reaproveitados, não recriados.
- `lib/inngest/functions.ts` (`processNewLead`) **já é** o esqueleto do Motor — será reestruturado para os 14 estágios abaixo, não substituído por outro mecanismo.

## 1. Princípio central

> Meta, Google, Kommo, Google Sheets, WhatsApp/Evolution API são **integrações**. Nunca contêm regra de negócio. Toda regra de negócio vive dentro da aplicação, no Motor.

O CRM (Kommo) é tratado exatamente como Google Sheets ou WhatsApp: um **consumidor** do Motor, plugado via a camada de integrations (seção 4). Nenhum código do Motor sabe o que é "Kommo" — ele sabe que existe uma lista de integrações configuradas para aquele formulário/workspace, e as invoca via uma interface comum.

## 2. Fluxo único obrigatório

Todo lead — de qualquer origem — atravessa exatamente esta sequência. Não existem fluxos paralelos por provedor.

```
Origem → Webhook → Ingest → Normalização → Identificação do Workspace
  → Identificação do Cliente → Identificação do Formulário
  → Aplicação das regras → Validação → Rodada da Vez
  → Persistência → Integrações → Logs → Finalização
```

| Estágio | Onde vive no código | Observação de implementação |
|---|---|---|
| Webhook | `app/api/webhooks/leads/route.ts` (hoje genérico) + futuros `app/api/webhooks/meta`, `app/api/webhooks/google` | Responde rápido (200/202) e delega ao Inngest — nunca processa inline |
| Ingest | `lib/leads/providers/{meta,google}/ingest.ts` | Busca o dado completo na API oficial da origem a partir do ID recebido no webhook; converte para o **Modelo Canônico de Lead** (seção 3) |
| **Idempotência** *(não é uma caixa do diagrama, mas é obrigatória logo após o Ingest — ver seção 5)* | `gestao_leads.external_id` `UNIQUE` | Se já processado, nenhuma ação é reexecutada |
| Normalização | `lib/leads/normalize.ts` | Telefone (regra do 9º dígito por DDD), nome, e-mail — lógica já portada do N8N |
| Identificação do Workspace + Identificação do Formulário | `gestao_leads_source_forms` (ver PRD-FONTES-DE-ENTRADA.md) | Na prática é **uma única consulta**: o `external_form_id`/`external_page_id` do payload resolve direto para a linha de configuração do formulário, que já traz `workspace_id`. Não são duas buscas sequenciais independentes — apresentado em separado no diagrama por clareza conceitual |
| Identificação do Cliente | Dedupe por telefone/e-mail dentro do `workspace_id` já resolvido | **Assunção a confirmar com você:** interpretei "Cliente" aqui como *identificação do contato* (é um lead novo ou um retorno de alguém já conhecido?), reaproveitando a lógica de deduplicação já implementada em `processNewLead`. Se "Cliente" for uma entidade nova e distinta de Workspace (ex.: um workspace-agência com múltiplos clientes finais), me avisa — o schema abaixo é aditivo e comporta isso sem quebrar nada |
| Aplicação das regras | `gestao_leads_source_forms.rules` (jsonb) | Regras específicas daquele formulário (mapeamento de campos, qualificação) |
| Validação | `lib/leads/validate.ts` | Campos obrigatórios, formato, sanidade |
| Rodada da Vez | `assign_next_seller()` (RPC, já implementada) | Transacional — sem alteração necessária |
| Persistência | `gestao_leads` (insert) | Registro mestre, independente da origem |
| Integrações | `lib/leads/integrations/{kommo,sheet,evolution,webhook}.ts` | Executam em paralelo/sequência conforme config do formulário; falha em uma não bloqueia as outras |
| Logs | `gestao_leads_audit_logs` | Um evento por estágio |
| Finalização | Status final em `gestao_leads.status` | `done` / `failed` / `waiting_seller` |

## 3. Modelo Canônico de Lead

Depois do estágio **Ingest**, a aplicação nunca mais sabe se o lead veio da Meta ou do Google — ela processa um `CanonicalLead`:

```ts
type CanonicalLead = {
  externalId: string;        // Lead ID da origem (Meta leadgen_id, Google lead id...)
  sourceType: "meta" | "google" | "landing_page" | "webhook" | "api";
  sourceFormId: string;      // FK lógica para gestao_leads_source_forms
  name: string;
  phone: string | null;
  email: string | null;
  customFields: Record<string, unknown>;
  rawPayload: Record<string, unknown>; // payload original, preservado sempre
  receivedAt: string;
};
```

Colunas a adicionar em `gestao_leads` (aditivo, sem quebrar o que existe):
`external_id TEXT UNIQUE`, `source_type TEXT`, `source_form_id UUID`, `custom_fields JSONB`.

## 4. Camada de Adapters/Providers (obrigatória)

> Sempre que existir uma integração externa, ela é implementada nesta camada. A lógica de negócio nunca conhece detalhes específicos de uma API.

### Providers (entrada) — `lib/leads/providers/`
Responsáveis por: (a) descoberta/gestão via API oficial (listar páginas, listar formulários, validar token — usado pela UI de Fontes de Entrada) e (b) ingestão (buscar o lead completo a partir do webhook).

```ts
interface LeadSourceProvider {
  type: "meta" | "google";
  validateCredentials(credentials: unknown): Promise<{ valid: boolean; reason?: string }>;
  listPages(credentials: unknown): Promise<Array<{ externalId: string; name: string }>>;
  listForms(credentials: unknown, pageExternalId: string): Promise<Array<{ externalId: string; name: string }>>;
  fetchLead(credentials: unknown, externalLeadId: string): Promise<CanonicalLead>;
  verifyWebhookSignature(request: Request): boolean;
}
```
Implementações: `lib/leads/providers/meta/index.ts`, `lib/leads/providers/google/index.ts` (Fase 2 do plano).

### Integrations (saída) — `lib/leads/integrations/`
Responsáveis por entregar o lead já processado a um destino externo.

```ts
interface LeadIntegration {
  type: "kommo" | "sheet" | "evolution" | "webhook";
  deliver(lead: CanonicalLead, assignedSeller: Seller | null, config: unknown): Promise<{ success: boolean; error?: string }>;
}
```
Implementações: `lib/leads/integrations/kommo.ts`, `sheet.ts`, `evolution.ts`, `webhook.ts` (genérico, para "APIs futuras" sem código novo).

**Regra de ouro desta camada:** um provider/integration nunca decide *se* algo deve acontecer (isso é regra de negócio, fica no Motor) — ele só sabe *como* falar com a API externa. Adicionar um novo provedor nunca altera `lib/inngest/functions.ts`.

## 5. Idempotência

`gestao_leads.external_id` é `UNIQUE`. Antes de qualquer processamento, o Motor verifica se aquele `external_id` já existe:
- Meta → `leadgen_id` da Graph API.
- Google → ID equivalente do Lead Form.
- Outras origens → identificador próprio definido pelo provider.

Se já processado: nenhuma ação é reexecutada (sem mensagem duplicada, sem CRM duplicado, sem planilha duplicada, sem distribuição duplicada). Isso substitui o campo antigo `leadgen_id` proposto no PRD original (mesmo conceito, generalizado para qualquer origem via `external_id` + `source_type`).

## 6. Google Sheets como destino, não banco

Já é assim no desenho atual — reforçado aqui: se a escrita na planilha falhar, o lead já está persistido em `gestao_leads`, distribuído e notificado. A sincronização da planilha é reexecutável via retry do Inngest, isolada das demais integrações.

## 7. Primeiro módulo a desenvolver: Fontes de Entrada

Ver [PRD-FONTES-DE-ENTRADA.md](PRD-FONTES-DE-ENTRADA.md) — cobre o fluxo completo de conectar Meta Business (token → páginas → formulários → configuração por formulário) e o equivalente para Google, usando os `LeadSourceProvider`s desta camada.

## 8. Mapeamento: o que já existe → papel na nova arquitetura

| Já existe | Papel no Motor |
|---|---|
| `core_workspaces` | Tenant (interpretado como "Workspace" no pipeline) |
| `gestao_leads` | Persistência do Modelo Canônico |
| `gestao_leads_sellers` + `assign_next_seller()` | Rodada da Vez transacional |
| `gestao_leads_notification_configs` | Config da integração Evolution (vira parte da config por formulário) |
| `gestao_leads_meta_connections` | **Substituída** pela camada Fontes de Entrada (`gestao_leads_sources` + `_source_pages` + `_source_forms`) — modelo antigo era 1 conexão = 1 página fixa por workspace; o novo modelo descobre páginas/formulários dinamicamente via Graph API |
| `lib/inngest/functions.ts` (`processNewLead`) | Reestruturado para os 14 estágios, mantendo o mesmo mecanismo (Inngest, retries, steps duráveis) |
| `features/leads/components/*` (Dashboard) | Consumidor do Motor — sem alteração de arquitetura, só passa a ler dados reais quando a Fase de UI real chegar |
