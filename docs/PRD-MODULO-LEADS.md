# 📋 PRD: Módulo de Distribuição de Leads (Rodada da Vez)

## 1. Visão Geral
**Objetivo:** Receber leads da Meta (e futuramente Google) via webhook, identificar o cliente (Workspace), aplicar as regras da "Rodada da Vez" para encontrar o próximo vendedor disponível e enviar os dados no WhatsApp do vendedor via Evolution API.

Este sistema é **operado pelo Admin (Agência)** para centralizar a recepção e distribuição, substituindo automações espalhadas no N8N.

## 2. Casos de Uso (Admin)
- Como Admin, conecto a Meta para que os leads cheguem via Webhook sem polling.
- Como Admin, vejo todos os leads dos clientes em uma tabela de log consolidada.
- Como Admin, se um vendedor de um cliente falta ou fica indisponível, eu marco o vendedor como 'Off' para que a Rodada da Vez o pule automaticamente.
- Como Admin, vejo as mensagens do WhatsApp chegando em tempo real para os vendedores, garantindo a entrega.

## 3. Arquitetura da Rodada da Vez
O Inngest orquestra a chegada do Lead (`app/api/webhooks/meta`). A parte central é a distribuição.

### A Função Atômica (SQL)
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

### Tabelas Envolvidas
**`gestao_leads`**
- Armazena o lead: `name`, `phone`, `email`, `campaign_id`, `ad_id`.
- `leadgen_id` (UNIQUE) impede processamento duplo do mesmo webhook.

**`gestao_leads_sellers`**
- Vendedores que não têm login no sistema.
- Controle `status` (`available` / `off`).
- `last_lead_at` para ordenar a fila da Rodada da Vez.

**`gestao_leads_notification_configs`**
- Instância da Evolution API para envio de mensagem e os templates de WhatsApp.

## 4. UI/UX (Aba Leads)
A interface serve para você gerenciar o fluxo de cada cliente:
- **Tabela de Vendedores (`SellersTable`):** Lista quem está na fila. Um switch On/Off para ligar ou desligar o recebimento de leads para aquele vendedor.
- **Log de Leads (`LeadsLog`):** Histórico dos leads que entraram e para qual vendedor foram designados.

## 5. Critérios de Aceite MVP
- [ ] Receber webhook e responder 200 rápido (processamento via Inngest).
- [ ] Deduplicação pelo `leadgen_id`.
- [ ] Rodada da Vez distribui corretamente para quem está `available` sem repetir o mesmo vendedor indevidamente.
- [ ] Envio do WhatsApp via Evolution para o vendedor sorteado.
- [ ] Se não há vendedor `available`, o lead fica com status `waiting_seller`.
