# 🧠 Arquitetura: Motor de Leads (Lead Processing Engine)

**Status:** Aprovado
**Foco:** O aplicativo é a infraestrutura de processamento de leads para realizar a "Rodada da Vez" dos clientes da Agência.

## 1. Princípio central

Toda regra de negócio vive dentro da aplicação, no Motor. 
A Meta e o Google são **origens** de dados. O WhatsApp e as Planilhas são **integrações de saída** (notificações e backup). 

O CRM (Kommo) é tratado apenas como um **consumidor futuro** do Motor. Para a fase atual, o sistema foca em receber o lead, processar o rodízio e alertar os vendedores via WhatsApp.

## 2. Fluxo de Processamento (Rodada da Vez)

Todo lead atravessa esta sequência no Motor:

1. **Webhook:** Recebe o lead da Meta (ou Google).
2. **Ingest:** Converte para o Modelo Canônico.
3. **Idempotência:** `gestao_leads.external_id` UNIQUE garante que o lead não seja processado duas vezes.
4. **Normalização:** Ajuste de telefone e e-mail.
5. **Identificação do Formulário/Workspace:** Direciona para o cliente correto.
6. **Rodada da Vez:** Função SQL atômica `assign_next_seller()` distribui o lead para o próximo vendedor disponível.
7. **Persistência:** Salva o lead em `gestao_leads`.
8. **Notificações:** Envia mensagem de WhatsApp via Evolution API para o vendedor.

## 3. Modelo Canônico de Lead

```ts
type CanonicalLead = {
  externalId: string;
  sourceType: "meta" | "google";
  sourceFormId: string;
  name: string;
  phone: string | null;
  email: string | null;
  customFields: Record<string, unknown>;
  rawPayload: Record<string, unknown>;
  receivedAt: string;
};
```

## 4. Idempotência e Concorrência

- `gestao_leads.external_id` é `UNIQUE`. 
- A distribuição é feita pela função transacional `assign_next_seller()` (que já utiliza `FOR UPDATE SKIP LOCKED`). Isso impede completamente que dois leads simultâneos caiam no mesmo vendedor indevidamente.

## 5. Mapeamento de Tabelas Principais

| Tabela | Papel no Motor |
|---|---|
| `core_workspaces` | Workspace (Cliente da Agência) |
| `gestao_leads` | Registro mestre dos leads |
| `gestao_leads_sellers` | Fila da vez (vendedores disponíveis para o Workspace) |
| `gestao_leads_sources` | Conexões de entrada (ex: Token do Business Manager) |
| `gestao_leads_form_configs` | Configurações do formulário |
| `lib/inngest/functions.ts` | Motor assíncrono que rege as etapas |
