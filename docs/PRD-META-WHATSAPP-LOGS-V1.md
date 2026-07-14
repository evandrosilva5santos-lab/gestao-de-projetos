---
name: prd-meta-whatsapp-logs
description: PRD executável para validar e corrigir fluxo Meta→WhatsApp→Logs
metadata:
  type: reference
  deadline: "2026-07-15 (amanhã)" 
  status: "BLOCKER de produção"
  epic: "Lead Distribution Pipeline"
  createdAt: "2026-07-14 14:58 GMT-3"
  progress: "[ ] TASK 1.1 | [ ] TASK 1.2 | [ ] TASK 1.3 | [ ] TASK 2.1 | [ ] TASK 2.2 | [ ] TASK 2.3 | [ ] TASK 2.4 | [ ] TASK 3.1"
---

# 📋 PRD: Validação e Correção Meta → WhatsApp → Logs

**Objetivo:** Fazer leads chegarem **end-to-end** (Meta → Webhook → Inngest → WhatsApp → Logs visíveis)

**Deadline:** 2026-07-15 (amanhã)

---

## 📌 CONTEXTO

**O Problema:** Você conectou Meta + WhatsApp + Inngest há 2 dias, mas:
- Leads não saem do Meta
- WhatsApp não recebe nada
- Logs não aparecem no dashboard
- Impossível debugar

**Raiz:** Webhook do Meta → Sistema não está conectado. Sem isso, nada flui.

---

## 🎯 REQUISITOS FUNCIONAIS

### MUST HAVE (Pra funcionar hoje)

- [ ] **R1:** Meta webhook recebe lead form submission → Sistema registra
- [ ] **R2:** Lead é identificado para o workspace certo (não vaza entre clientes)
- [ ] **R3:** Inngest processa o lead (normaliza, dedup, rodada)
- [ ] **R4:** WhatsApp vendedor recebe notificação com dados do lead
- [ ] **R5:** Logs da auditoria aparecem no dashboard (aba "Leads & Logs")
- [ ] **R6:** Admin pode ver sucesso/falha de cada integração por lead

### NICE TO HAVE (Semana que vem)

- [ ] WhatsApp grupo recebe lead (além do 1-to-1 do vendedor)
- [ ] Reprocessar leads falhados com botão manual
- [ ] Dashboard de métricas (leads recebidos, enviados, falhados)

---

## 🏗️ ARQUITETURA (O que já existe vs o que falta)

```
Meta Lead Form
    ↓ [webhook POST]
/app/api/webhooks/meta
    ↓ [valida signature + JSON]
❌ FALTA: Identifica workspace via gestao_leads_source_forms
    ↓ [dispara Inngest]
lib/inngest/functions.ts → processNewLead()
    ↓ [normaliza, dedup, rodada]
lib/leads/integrations/{evolution, kommo, sheet}.ts
    ↓ [entrega aos destinos]
❌ FALTA: Salva logs em gestao_leads_audit_logs
    ↓ [retorna status]
Dashboard → ClientLogsTab
    ↓ [admin vê tudo]
❌ FALTA: UI do componente
```

**O que precisamos:**
1. Webhook `/app/api/webhooks/meta` (provavelmente existe mas não wired)
2. Table `gestao_leads_source_forms` (não existe — pré-requisito do PRD-FONTES)
3. Server Action `getLeadAuditLogs(workspaceId)` (não existe)
4. Componente `ClientLogsTab` (não existe)
5. Wiring em `ClientWorkspaceShell` (falta a aba)

---

## 📊 ESCOPO & FASES

### **FASE 1: Validação (Hoje — 4 horas)**

#### ✅ / ❌ TASK 1.1: Testar Webhook Meta 
**Objetivo:** Confirmar que Meta consegue entregar dados  
**Arquivo:** `app/api/webhooks/meta/route.ts`
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

```bash
# 1. Abrir Webhook Settings da página Meta
https://developers.facebook.com/docs/graph-api/webhooks/getting-started/webhooks-setup

# 2. Configurar no seu app:
POST Callback URL: https://seuapp.com/app/api/webhooks/meta
GET Verify Token: alguma-string-aleatoria

# 3. Enviar test event de Meta para validar
# Meta deveria fazer POST no seu endpoint com X-Hub-Signature-256

# 4. Se receber 200, webhook está vivo ✅
```

**Teste:**
```bash
curl -X POST https://localhost:3000/app/api/webhooks/meta \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=..." \
  -d '{"entry":[{"id":"123","changes":[{"value":{"leadgen_id":"456"}}]}]}'
```

---

#### ✅ / ❌ TASK 1.2: Testar Evolution API (WhatsApp)
**Objetivo:** Validar que Evolution consegue enviar mensagens  
**Arquivo:** `lib/leads/integrations/evolution.ts`
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

```bash
# 1. Pegar config do environment (.env.local):
EVOLUTION_URL=https://seu-evolution.com
EVOLUTION_TOKEN=seu-api-token
EVOLUTION_INSTANCE=seu-instance-name

# 2. Enviar mensagem teste:
curl -X POST $EVOLUTION_URL/message/sendText/$EVOLUTION_INSTANCE \
  -H "Content-Type: application/json" \
  -H "apikey: $EVOLUTION_TOKEN" \
  -d '{
    "number": "5511999999999",
    "text": "Teste de lead"
  }'
```

---

#### ✅ / ❌ TASK 1.3: Listar Logs Salvos (Database)
**Objetivo:** Confirmar que logs estão sendo salvos  
**Arquivo:** Supabase Schema
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

```sql
-- No Supabase Console, rodar:
SELECT COUNT(*) FROM gestao_leads_audit_logs;
SELECT * FROM gestao_leads_audit_logs LIMIT 5;
```

---

### **FASE 2: Correções Críticas (~2h)**

#### ✅ / ❌ TASK 2.1: Criar/Validar Table `gestao_leads_source_forms`
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

```sql
CREATE TABLE gestao_leads_source_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES core_workspaces(id),
  external_form_id TEXT NOT NULL,
  external_page_id TEXT NOT NULL,
  form_name TEXT,
  source_type TEXT DEFAULT 'meta',
  is_active BOOLEAN DEFAULT TRUE,
  rules JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(external_form_id, workspace_id)
);
```

---

#### ✅ / ❌ TASK 2.2: Server Action `getLeadAuditLogs(workspaceId)`
**Arquivo:** `features/leads/actions.ts`
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

---

#### ✅ / ❌ TASK 2.3: Componente UI `ClientLogsTab`
**Arquivo:** `features/leads/components/ClientLogsTab.tsx`
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

---

#### ✅ / ❌ TASK 2.4: Wiring em `ClientWorkspaceShell`
**Arquivo:** `features/leads/components/ClientWorkspaceShell.tsx`
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

---

### **FASE 3: Validação End-to-End (~1h)**

#### ✅ / ❌ TASK 3.1: Teste Simulado
**Status:** [ ] Iniciado [ ] Em Progresso [ ] Completo

**Checklist de Validação:**
- [ ] Webhook recebeu evento
- [ ] Lead apareceu em `gestao_leads` table
- [ ] WhatsApp vendedor recebeu mensagem
- [ ] Log de cada etapa aparece no dashboard
- [ ] Status final = "success" ou "failed"

---

## 🎯 SUCESSO = ?

Quando tudo estiver pronto:

```
1. Criar lead em Meta Ads
   ↓
2. 2 segundos depois, vendedor recebe WhatsApp
   ↓
3. 2 segundos depois, admin vê em Dashboard:
   - Lead chegou
   - Cada etapa processada
   - Status final OK
   ↓
4. Repetir com 10 leads = tudo funciona 🎉
```

---

**Versão:** 1.0  
**Data:** 2026-07-14  
**Status:** Pronto para implementação  
**Estimativa:** 4-5 horas (Fase 1 + 2 + 3)
