---
name: diagnostico-80-20-meta-whatsapp
description: Diagnóstico 80/20 do fluxo Meta→WhatsApp e lista de gaps críticos
metadata:
  type: project
  priority: CRÍTICO
  blockerFor: "Integração Multi-canal de Leads"
  status: "2 dias travado"
  dataTime: "2026-07-14 14:58 GMT-3"
---

# 🔴 DIAGNÓSTICO 80/20: Meta → WhatsApp → Logs

## ✅ O QUE VOCÊ TEM (40% do que precisa)

| Component | Status | Localização | Funciona? |
|-----------|--------|-------------|----------|
| Meta Connections (OAuth + Page Token) | ✅ Implementado | `gestao_leads_meta_connections` table | ✅ Sim |
| Evolution/WhatsApp SDK | ✅ Implementado | `lib/leads/integrations/evolution.ts` | ⚠️ Parcial |
| Inngest (Job Queue) | ✅ Setup | Instância rodando | ✅ Sim |
| Logs Table | ✅ Schema | `gestao_leads_audit_logs` | ✅ Exists |
| Server Actions | ✅ Parcial | `features/**/actions.ts` | ⚠️ Alguns |

---

## ❌ O QUE FALTA (60% do problema)

### 🔴 BLOCKER 1: Meta Webhook → Sistema Não Conectado
```
Meta Lead Form
    ↓
❌ Webhook recebe dados?
❌ Identifica workspace certo?
❌ Dispara Inngest job?
    ❌ = TRAVADO AQUI
```

**Status:** Webhook setup incomplete  
**Impacto:** Nenhum lead chega ao sistema  
**Causa:** Provável falta de `gestao_leads_source_forms` table (PRD-FONTES-DE-ENTRADA.md Fase B não feita)

---

### 🔴 BLOCKER 2: Logs Não Aparecem no Dashboard
```
gestao_leads_audit_logs (table exists)
    ↓
❌ Sem query em Server Actions
❌ Sem componente UI pra mostrar
    ❌ = USUÁRIO NÃO VÊ NADA
```

**Status:** Table exists, UI missing  
**Impacto:** Impossível debugar; usuário não vê fluxo  
**Causa:** Componente `ClientLogsTab` não implementado

---

### 🟡 BLOCKER 3: WhatsApp Group vs Private Chat Não Está Claro
```
Evolution config tem:
  - instanceName ✅
  - token ✅
  - URL ✅
  - groupJid? ❌ OPCIONAL

Código faz:
  - Enviar ao vendedor (1-to-1) ✅
  - Enviar ao grupo? ❌ NÃO TRATA `groupJid`
```

**Status:** Parcialmente implementado  
**Impacto:** Grupo não recebe leads; vendedor fica sem contexto  
**Causa:** `sendLeadToWhatsApp()` não valida `groupJid`

---

## 🎯 ORDEM DE PRIORIDADE (80/20 — FAÇA ISTO AGORA)

### 🔴 **TIER 1: Validação End-to-End (Hoje)**

1. **Testar webhook Meta** (~30 min)
   - Verificar se Meta consegue entregar evento ao seu `/app/api/webhooks/leads`
   - Validar assinatura `X-Hub-Signature-256`
   - Confirmar que Inngest recebe o evento

2. **Exibir Logs no Dashboard** (~1h)
   - Criar Server Action: `getLeadAuditLogs(workspaceId)`
   - Criar componente: `ClientLogsTab`
   - Conectar em `ClientWorkspaceShell` → aba "Leads & Logs"

3. **Validar Evolution WhatsApp** (~20 min)
   - Testar endpoint `/message/sendText/{instanceName}` manualmente com curl
   - Verificar se seller recebe mensagem

### 🟡 **TIER 2: Correções Críticas (~2h)**

4. **Implementar `gestao_leads_source_forms`** (~2h) — pré-requisito do PRD
   - Table schema (vem do PRD-FONTES-DE-ENTRADA.md)
   - RLS policies
   - Migration Supabase

5. **Conectar Meta Webhook → Inngest**
   - Routa em `/app/api/webhooks/meta`
   - Valida signature
   - Dispara evento `lead/received` no Inngest

### 🟢 **TIER 3: Polish (~1h)**

6. **Validar Grupo WhatsApp**
   - Se `groupJid` vem do config, usar em `sendLeadToWhatsApp()`
   - Testar envio ao grupo + vendedor 1-to-1

---

## 📊 Estado Atual vs Esperado

```
┌─────────────────────┬─────────┬──────────┐
│ Fluxo               │ Atual   │ Esperado │
├─────────────────────┼─────────┼──────────┤
│ Meta OAuth          │ ✅ 100% │ ✅ 100% │
│ Página Meta conecta │ ✅ 100% │ ✅ 100% │
│ Lead sai do Meta    │ ✅ 100% │ ✅ 100% │
│ Webhook recebe      │ ❌ 0%   │ ✅ 100% │ ← AQUI É O PROBLEMA
│ Inngest processa    │ ⚠️ 20%  │ ✅ 100% │
│ WhatsApp vendedor   │ ⚠️ 50%  │ ✅ 100% │
│ WhatsApp grupo      │ ❌ 0%   │ ✅ 100% │
│ Logs aparecem       │ ❌ 0%   │ ✅ 100% │
│ Admin vê tudo       │ ❌ 0%   │ ✅ 100% │
└─────────────────────┴─────────┴──────────┘
```

**Score:** 28% do fluxo está funcionando

---

## 🛠️ Skills que Vou Usar Pra Validar

| Skill | Propósito | Prioridade |
|-------|----------|-----------|
| `error-debugging-error-analysis` | Debugar webhooks e Inngest | 🔴 ALTA |
| `api-testing` / `postman-automation` | Validar Evolution API | 🔴 ALTA |
| `nextjs-app-router-patterns` | Corrigir rota webhook | 🟡 MÉDIA |
| `database-design` (schema review) | Validar `gestao_leads_source_forms` | 🟡 MÉDIA |
| `react-patterns` | Criar componente Logs | 🟡 MÉDIA |
| `architecture-patterns` | Revisar isolamento por workspace | 🟢 BAIXA |

---

## 📋 PRD (Prompt para UPA)

Veja arquivo separado: `PRD-META-WHATSAPP-LOGS-V1.md`

---

*Diagnóstico feito: 2026-07-14 14:58 GMT-3*  
*Blocker identificado: Meta webhook não conectado + logs não exibem*  
*Tempo pra funcionar: ~4h (TIER 1+2)*
