---
name: sumario-executivo-upa
description: Sumário visual + checklist pra colar direto na UPA (ClickUp/Linear)
metadata:
  type: reference
  format: "Copiar/colar direto"
  createdAt: "2026-07-14 14:58 GMT-3"
---

# 🚨 BLOCKEADO: Meta → WhatsApp → Logs (2 dias)

## STATUS ATUAL
```
Meta Lead Form    ✅ Conectada
   ↓
Webhook Sistema   ❌ NÃO RECEBE
   ↓
Inngest Job       ⚠️ Não dispara
   ↓
WhatsApp Vendor   ❌ Não chega
   ↓
Logs Dashboard    ❌ Invisível

RESULTADO: 0% funcional
```

---

## IMPACTO
- ❌ Nenhum lead chega ao sistema
- ❌ Vendedores não sabem dos leads
- ❌ Admin não consegue debugar
- ❌ Impossível validar integração

---

## SOLUÇÃO: 4 TAREFAS (4-5 horas)

### 1️⃣ [TASK] Validar Webhook Meta
**Tipo:** Validação  
**Tempo:** 30 min  
**Status:** [ ] TODO [ ] IN_PROGRESS [ ] DONE  
**Como:** 
```bash
curl -X POST http://localhost:3000/app/api/webhooks/meta \
  -H "Content-Type: application/json" \
  -d '{"entry":[{"changes":[{"value":{"leadgen_id":"123"}}]}]}'
```
**Sucesso:** Se retorna 200 OK  
**Próxima:** Se OK → TASK 2  
**Referência:** DIAGNOSTICO-80-20-META-WHATSAPP.md → TASK 1.1

---

### 2️⃣ [FEATURE] Criar Table + Server Action + UI de Logs
**Tipo:** Feature (3 sub-tasks)  
**Tempo:** 2h 30min  
**Status:** [ ] TODO [ ] IN_PROGRESS [ ] DONE  

#### 2A: Table `gestao_leads_source_forms`
**Status:** [ ] TODO [ ] DONE
- [ ] Migration SQL criada
- [ ] RLS policies ativas
- [ ] Seed data de teste

#### 2B: Server Action `getLeadAuditLogs`
**Status:** [ ] TODO [ ] DONE
- [ ] Criado em `features/leads/actions.ts`
- [ ] Filtra por workspace_id
- [ ] Retorna últimos 100 logs

#### 2C: Componente `ClientLogsTab`
**Status:** [ ] TODO [ ] DONE
- [ ] UI com tabela de logs
- [ ] Colunas: Tempo, Lead ID, Etapa, Status, Mensagem
- [ ] Auto-refresh (5s)
- [ ] Integrado em `ClientWorkspaceShell`

**Referência:** PRD-META-WHATSAPP-LOGS-V1.md → FASE 2

---

### 3️⃣ [BUGFIX] Evolution API Não Envia WhatsApp
**Tipo:** Bugfix  
**Tempo:** 30 min  
**Status:** [ ] TODO [ ] IN_PROGRESS [ ] DONE  
**Problema:** `sendLeadToWhatsApp()` não valida `groupJid`  
**Solução:** Validar `groupJid` antes de enviar  
**Teste:** Grupo WhatsApp recebe mensagem  
**Referência:** DIAGNOSTICO-80-20-META-WHATSAPP.md → BLOCKER 3

---

### 4️⃣ [TEST] Validação End-to-End
**Tipo:** QA  
**Tempo:** 30 min  
**Status:** [ ] TODO [ ] IN_PROGRESS [ ] DONE  
**Checklist:**
- [ ] Lead sai de Meta
- [ ] Webhook recebe
- [ ] Inngest processa (ver dashboard)
- [ ] WhatsApp vendor recebe em <5s
- [ ] Dashboard mostra logs de cada etapa
- [ ] Status final = SUCCESS

**Referência:** PRD-META-WHATSAPP-LOGS-V1.md → FASE 3

---

## 🎯 RESULTADO ESPERADO
```
Meta Lead Form    ✅ Conectada
   ↓
Webhook Sistema   ✅ RECEBE
   ↓
Inngest Job       ✅ DISPARA
   ↓
WhatsApp Vendor   ✅ CHEGA em 3s
   ↓
Logs Dashboard    ✅ VISÍVEL

RESULTADO: 100% funcional 🎉
```

---

## 📊 MÉTRICAS DE SUCESSO
- ✅ Lead chega em <5s (Meta → WhatsApp)
- ✅ 100% dos logs aparecem no dashboard
- ✅ Admin consegue debugar por lead
- ✅ 10 leads teste = 10 sucessos

---

## DEPENDÊNCIAS
- Node.js 18+
- Supabase CLI conectado
- Meta app com webhook configurado
- Evolution API rodando
- Inngest dashboard acessível

---

## PRÓXIMAS ETAPAS (DEPOIS DISTO)
1. Reprocessar leads falhados manualmente
2. Grupo WhatsApp automático
3. Template customizável de mensagem
4. Dashboard de métricas (volume, sucesso rate)

---

## 🔗 REFERÊNCIAS
- Diagnóstico completo: `DIAGNOSTICO-80-20-META-WHATSAPP.md`
- PRD detalhado: `PRD-META-WHATSAPP-LOGS-V1.md`

---

## 👤 ATRIBUIÇÃO
- **Quem:** Evan (você)
- **Status:** 🔴 BLOCKER
- **Priority:** 🚨 CRÍTICO
- **Deadline:** 2026-07-15 (amanhã)
- **Esforço:** 4-5 horas

---

## ⚡ QUICK START (HOJE)
1. Testar webhook (30 min) — se falhar aqui, webhook não funciona
2. Se webhook OK → implementar Tasks 2 + 3 (3h)
3. Testar end-to-end (30 min)
4. Celebrar 🎉
