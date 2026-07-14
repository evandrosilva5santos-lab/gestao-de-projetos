# PRD - Integração End-to-End: Meta, Kommo CRM, Google Sheets e WhatsApp

## 1. Visão Geral
Este documento especifica a integração para captura de leads do Meta Ads (Instagram/Facebook) e seu roteamento automático para o Kommo CRM, Google Sheets, e disparo de notificação no WhatsApp, focado na consultora Karol Shutz.

## 2. Componentes da Arquitetura
- **Webhook Meta**: Endpoint (`/api/webhooks/leads`) para receber o payload do lead gerado no Meta.
- **Mapeamento Dinâmico**: Conversão de IDs de custom fields vindos do Meta para nomes legíveis e roteamento por regras de tag (ex: `META ADS`, `GOOGLE ADS`).
- **Kommo CRM Adapter**: Roteamento do lead para o funil correto, status, pipeline, com todos os campos mapeados (Nome, Email, Telefone, UTMs).
- **Google Sheets Adapter**: Inserção do lead em planilha de backup.
- **WhatsApp Sender (A implementar)**: Disparo de mensagens automáticas de recepção/aviso para o lead ou consultor.

## 3. Estado Atual (Implementado)
- Webhook preparado para recepção de payload do Facebook.
- Obtenção do Page ID e Page Access Token reais da Graph API (Page ID: `1144436115413184`).
- Script de teste ponta a ponta (`scratch/test-lead-karol.ts`) que simula a chegada do lead.
- Roteamento inteligente Kommo CRM (com fallback tags e mapping dinâmico) adaptado.
- Estrutura de banco de dados no Supabase para credenciais e logs.

## 4. Próximos Passos (Para Implementação)
### 4.1. WhatsApp Automation
- [ ] Definir provedor de envio de WhatsApp (Evolution API, Z-API, Baileys, Chatwoot, Meta Cloud API).
- [ ] Construir adapter para envio (`lib/whatsapp/sender.ts`).
- [ ] Implementar fila/job para evitar timeout no envio do WhatsApp (background job ou Vercel function).
- [ ] Integrar no fluxo de processamento de leads logo após salvamento no Kommo CRM.

### 4.2. Planilhas e Integração Avançada
- [ ] Conectar as credenciais Google Sheets e criar o adapter.
- [ ] Obter Spreadsheet ID e Mapeamento de abas.

## 5. Fluxo de Teste Atual
1. Rodar `npx tsx scratch/insert-karol-credentials.ts` para popular banco com dados do Facebook e CRM.
2. Rodar `npx tsx scratch/test-lead-karol.ts` para enviar o payload fake de um lead entrando pela página real da consultora.
