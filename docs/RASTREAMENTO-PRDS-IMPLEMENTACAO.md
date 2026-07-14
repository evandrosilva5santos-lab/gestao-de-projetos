---
name: rastreamento-prds-implementacao
description: Análise de todos os PRDs/Planos/Arquitetura - o que foi feito vs o que falta
metadata:
  type: reference
  createdAt: "2026-07-14 15:10 GMT-3"
  totalPRDs: 7
---

# 📊 RASTREAMENTO: PRDs × Implementação

**Data:** 2026-07-14 15:10 GMT-3  
**Análise:** Todos os 7 documentos (PRDs + Planos + Arquitetura)

---

## 📋 MAPA DE DOCUMENTOS (O que cada um trata)

| # | Documento | O que trata | Status | Depende de |
|---|-----------|-------------|--------|-----------|
| 1 | **ARQUITETURA-MOTOR-DE-LEADS.md** | Motor central (14 estágios, webhook → normalizar → distribuir) | 🟡 BLUEPRINT | — (referência pra tudo) |
| 2 | **PRD-MODULO-LEADS.md** | Especificação do Motor (casos de uso, banco de dados, tabelas, RLS) | 🟡 APROVADO | ARQUITETURA |
| 3 | **PRD-FONTES-DE-ENTRADA.md** | Central de integrações + conexão Meta/Google (descoberta automática) | 🟡 DRAFT | PRD-MODULO-LEADS |
| 4 | **PRD-Meta-Kommo-WhatsApp-Sheets.md** | Integração específica Karol (webhook → Kommo + Sheets + WhatsApp) | 🟢 PARCIAL | PRD-MODULO-LEADS |
| 5 | **PLANO-EXECUCAO-MODULO-LEADS.md** | Diagnóstico N8N → migração (problema + solução proposta) | 🟢 REFERÊNCIA | PRD-MODULO-LEADS |
| 6 | **PLANO-REORGANIZACAO-CLIENT-CENTRIC.md** | Mudança de navegação (função → cliente) | 🟡 APROVADO | — (UI independente) |
| 7 | **PRD-META-WHATSAPP-LOGS-V1.md** | NOVO (diagnóstico 80/20 + fix para webhook/logs) | 🔴 CRÍTICO | PRD-MODULO-LEADS |

---

## ✅ / ❌ O QUE FOI IMPLEMENTADO

### 🟢 JÁ EXISTE (100% pronto)

| Feature | Localização | Status | Notas |
|---------|-------------|--------|-------|
| **Meta OAuth (login + page token)** | `features/integration-hub` | ✅ Funcional | Token guardado em `gestao_leads_meta_connections` |
| **Normalize.ts (telefone)** | `lib/leads/normalize.ts` | ✅ Pronto | Portado do N8N, regra 9º dígito implementada |
| **assign_next_seller() RPC** | Supabase SQL | ✅ Pronto | Atômico com `FOR UPDATE SKIP LOCKED` |
| **gestao_leads table** | Supabase schema | ✅ Pronto | Multi-tenant, RLS ativo |
| **gestao_leads_sellers table** | Supabase schema | ✅ Pronto | Fila da vez, status ativo/off |
| **Inngest setup** | `lib/inngest/functions.ts` | ✅ Pronto | Infrastructure pronta, `processNewLead` skeleton existe |
| **Evolution API (WhatsApp)** | `lib/leads/integrations/evolution.ts` | ⚠️ Parcial | Envia 1-to-1 ao vendedor, grupo `groupJid` não validado |
| **SellersQueueTab (UI)** | `features/leads/components/SellersQueueTab.tsx` | ✅ Funcional | Lê dados reais, toggle ativar/desativar |
| **ClientsListScreen (UI)** | `features/leads/components/ClientsListScreen.tsx` | ✅ Funcional | Lista clientes, mas sem wiring pra ClientWorkspaceShell |
| **ClientWorkspaceShell (UI)** | `features/leads/components/ClientWorkspaceShell.tsx` | ⚠️ 50% | Shell existe, abas definidas, falta logs tab |
| **Meta provider (code)** | `lib/leads/providers/meta.ts` | ✅ Pronto | `fetchMetaPages`, `fetchMetaForms` implementados |
| **Kommo adapter** | `lib/leads/integrations/kommo.ts` | ⚠️ 80% | Envia leads, falta validação de campos customizados |
| **Sheets adapter** | `lib/leads/integrations/sheet.ts` | ⚠️ 80% | Envia para planilha, falta field mapping flexível |
| **Audit logs table** | `gestao_leads_audit_logs` | ✅ Pronto | Table pronta, RLS ativo, falta UI pra exibir |

---

### 🔴 FALTA IMPLEMENTAR (CRÍTICO)

| Feature | Bloqueador? | Causa | Impacto |
|---------|-------------|-------|--------|
| **Webhook `/app/api/webhooks/meta` (conectado)** | 🔴 SIM | Código existe mas não está sendo chamado | Nenhum lead chega ao sistema |
| **Table `gestao_leads_source_forms`** | 🔴 SIM | Não existe | Não consegue mapear form → workspace |
| **Server Action `getLeadAuditLogs`** | 🔴 SIM | Não existe | Impossível trazer logs pra UI |
| **ClientLogsTab (componente UI)** | 🔴 SIM | Não existe | Admin não vê logs |
| **Wiring ClientsListScreen → ClientWorkspaceShell** | 🟡 ALTO | Callback `onSelect` não passa contexto | Usuário clica em cliente, nada acontece |
| **Webhook recebe e dispara Inngest** | 🔴 SIM | Rota existe, processamento não conectado | Lead não processa |
| **WhatsApp grupo (`groupJid` validation)** | 🟡 MÉDIO | Código existe mas não valida | Grupo não recebe notificação |
| **API Meta App Review** | 🟡 MÉDIO | Pendente com Meta | Só funciona em dev/test mode |
| **ClientPortal (visão do cliente)** | 🟢 BAIXO | Não existe | Cliente não vê seus leads em tempo real |

---

## 🎯 DEPENDÊNCIAS E ORDEM DE IMPLEMENTAÇÃO

```
ARQUITETURA-MOTOR-DE-LEADS.md (blueprint, referência)
    ↓
PRD-MODULO-LEADS.md (especificação base)
    ├─→ PRD-FONTES-DE-ENTRADA.md (descoberta automática)
    ├─→ Webhook + Inngest (processamento)
    └─→ Integrações (Kommo, Sheets, Evolution)

PLANO-REORGANIZACAO-CLIENT-CENTRIC.md (navegação, independente)
    ├─→ ClientWorkspaceShell wiring
    ├─→ ClientLogsTab
    └─→ Logs exibição

PRD-META-WHATSAPP-LOGS-V1.md (validação 80/20 dos blockers)
```

---

## 🚨 TOP 10 PRDs/TAREFAS — ORDEM DE IMPLEMENTAÇÃO

### **1️⃣ [BLOCKER] FIX: Webhook Meta → Inngest (META → WHATSAPP → LOGS)**
**Documento:** PRD-META-WHATSAPP-LOGS-V1.md  
**Tempo:** 4-5h  
**Por quê PRIMEIRO:**
- Sem isso, nenhum lead chega ao sistema
- Você tá 2 dias travado nisto
- Desbloqueia tudo depois

**Tarefas:**
- [ ] Validar webhook recebe (curl test)
- [ ] Wiring webhook → Inngest job
- [ ] Criar `gestao_leads_source_forms` table
- [ ] Server Action `getLeadAuditLogs`
- [ ] Componente `ClientLogsTab`

**Status:** 🔴 BLOCKER
**Próximo:** Após isso funcionar 100%

---

### **2️⃣ [CRÍTICO] FIX: Wiring ClientsListScreen → ClientWorkspaceShell**
**Documento:** PLANO-REORGANIZACAO-CLIENT-CENTRIC.md (Fase A)  
**Tempo:** 30 min  
**Por quê SEGUNDO:**
- Usuário clica em cliente, nada acontece
- 3 linhas de código pra ficar pronto
- Desbloqueia navegação client-centric

**Tarefas:**
- [ ] Adicionar estado `selectedClient`
- [ ] Passar callback `onSelect`
- [ ] Renderizar `ClientWorkspaceShell` quando selecionado

**Status:** 🟡 ALTO  
**Próximo:** Após webhook funcionar

---

### **3️⃣ [CRÍTICO] FEATURE: PRD-FONTES-DE-ENTRADA (Fase B)**
**Documento:** PRD-FONTES-DE-ENTRADA.md  
**Tempo:** 6-8h  
**Por quê TERCEIRO:**
- Pré-requisito pra descoberta automática de formulários
- Sem isso, cada novo cliente = manual entry
- Necessário pra escalar

**Tarefas:**
- [ ] Tables: `gestao_leads_sources`, `gestao_leads_source_pages`, `gestao_leads_source_forms`
- [ ] Provider Meta: `validateCredentials`, `listPages`, `listForms`
- [ ] UI: Central de Integrações (wizard)
- [ ] UI: Fontes de Entrada (tabela)
- [ ] Server Actions: sincronizar, salvar config

**Status:** 🟡 DRAFT  
**Bloqueia:** Tudo que vem depois (sem form config, sem webhook roteamento)

---

### **4️⃣ [CRÍTICO] FEATURE: Inngest Motor Completo (14 estágios)**
**Documento:** ARQUITETURA-MOTOR-DE-LEADS.md  
**Tempo:** 8-10h  
**Por quê QUARTO:**
- Processa o lead (normalize, dedup, assign, deliver)
- Estrutura pra Kommo + Sheets + Evolution
- Idempotência garantida

**Tarefas:**
- [ ] Inngest function: 14 estágios (validate → normalize → assign → integrate → log)
- [ ] Error handling: retry, DLQ, notificação
- [ ] Logging estruturado (cada etapa → `gestao_leads_audit_logs`)
- [ ] Testes: mock leads de Meta

**Status:** 🟡 SKELETON  
**Bloqueia:** Integração com Kommo/Sheets/Evolution

---

### **5️⃣ [ALTO] FEATURE: Kommo CRM Integration (Full)**
**Documento:** PRD-Meta-Kommo-WhatsApp-Sheets.md  
**Tempo:** 4-5h  
**Por quê QUINTO:**
- Destino principal (cliente Karol)
- Field mapping customizável
- Webhook OK + Motor OK = Kommo fluxo pronto

**Tarefas:**
- [ ] Field mapping UI (custom fields Meta → Kommo)
- [ ] Deal creation com pipeline correto
- [ ] Contact upsert (dedup)
- [ ] Tags automáticas por fonte
- [ ] Erro handling: status 401, rate limit

**Status:** 🟢 80% (falta field mapping dinâmico)

---

### **6️⃣ [ALTO] FEATURE: Google Sheets Integration (Full)**
**Documento:** PRD-MODULO-LEADS.md (seção Integrações)  
**Tempo:** 3-4h  
**Por quê SEXTO:**
- Backup de todos os leads
- Relatório pra admin
- Menos crítico que Kommo mas importante

**Tarefas:**
- [ ] Append row com dados do lead
- [ ] Column mapping dinâmico
- [ ] Error handling: quota exceeded, sheet not found
- [ ] Teste: inserir 100 leads sem falhar

**Status:** ⚠️ 80% (falta dinâmico)

---

### **7️⃣ [ALTO] FEATURE: WhatsApp Integration (Full)**
**Documento:** PRD-Meta-Kommo-WhatsApp-Sheets.md  
**Tempo:** 2-3h  
**Por quê SÉTIMO:**
- Notificação vendedor (1-to-1)
- Notificação grupo
- Evolution API já está integrada, falta só validação

**Tarefas:**
- [ ] Validar `groupJid` se configurado
- [ ] Template customizável (lead name, phone, origem)
- [ ] Retry: se Evolution falhar
- [ ] Teste: enviar ao vendedor + grupo

**Status:** ⚠️ 50% (grupo não funciona)

---

### **8️⃣ [MÉDIO] FEATURE: ClientPortal (visão do cliente)**
**Documento:** PRD-MODULO-LEADS.md (seção UI)  
**Tempo:** 4-5h  
**Por quê OITAVO:**
- Cliente consegue ver seus leads em tempo real
- Não é blocker (admin já vê tudo)
- Aumenta experiência

**Tarefas:**
- [ ] Rota: `/app/(protected)/portal/leads`
- [ ] Auth: token do cliente (não login full)
- [ ] UI: tabela de leads, filtro status
- [ ] Real-time: Supabase RealtimeSubscription

**Status:** 🔴 NÃO EXISTE

---

### **9️⃣ [MÉDIO] FEATURE: Dashboard de Métricas**
**Documento:** PRD-MODULO-LEADS.md (Casos de Uso Admin)  
**Tempo:** 3-4h  
**Por quê NONO:**
- Admin vê volume, taxa de sucesso, falhas
- Importante pra debugging
- Não bloqueia fluxo principal

**Tarefas:**
- [ ] Cards: leads recebidos hoje, enviados, falhados
- [ ] Gráfico: timeline de leads/hora
- [ ] Taxa de sucesso por integração
- [ ] Top sources (origem)

**Status:** 🔴 NÃO EXISTE

---

### **🔟 [MÉDIO] REFACTOR: UI Navigation Client-Centric (Fase A + B + C)**
**Documento:** PLANO-REORGANIZACAO-CLIENT-CENTRIC.md  
**Tempo:** 2-3h (depois das tarefas 1-2)  
**Por quê DÉCIMO:**
- Limpeza de UI
- Remove "CRM & Funil" (é StartCRM)
- Deixa app focado em "entrega"
- Não bloqueia nada, só UX

**Tarefas:**
- [ ] Remover: CRM & Funil, Coming Soon items
- [ ] Integrar: Integrações (agência) como tela separada
- [ ] Integrar: Configurações mínimas
- [ ] Breadcrumb: Cliente fixo no topo

**Status:** ⚠️ 40% (shell existe, não está integrado)

---

## 📊 RESUMO: % DE IMPLEMENTAÇÃO POR PRD

| PRD | % Feito | Bloqueador? | Data finalização (estimada) |
|-----|---------|-------------|---------------------------|
| ARQUITETURA-MOTOR-DE-LEADS | 60% | Referência | — (ongoing) |
| PRD-MODULO-LEADS | 50% | Sim | 2026-07-20 |
| PRD-FONTES-DE-ENTRADA | 20% | Sim (TIER 1) | 2026-07-21 |
| PRD-Meta-Kommo-WhatsApp | 75% | Sim (falta webhook) | 2026-07-19 |
| PLANO-EXECUCAO | 100% | Referência | ✅ Done |
| PLANO-REORGANIZACAO | 30% | Não | 2026-07-18 |
| PRD-META-WHATSAPP-LOGS-V1 | 0% | 🔴 CRÍTICO | 2026-07-15 (amanhã) |

**Score geral:** 40% implementado, 60% pendente

---

## 🚀 RECOMENDAÇÃO: ROADMAP EXECUTIVO

**HOJE (2026-07-14):**
1. [BLOCKER] Entender webhook Meta (test com curl)
2. [BLOCKER] Criar table `gestao_leads_source_forms`

**AMANHÃ (2026-07-15):**
1. [BLOCKER] Webhook → Inngest wiring
2. [BLOCKER] Server Action `getLeadAuditLogs`
3. [BLOCKER] ClientLogsTab component
4. [CRÍTICO] Fix ClientWorkspaceShell wiring (30 min)

**Próxima semana (2026-07-16 a 2026-07-21):**
1. PRD-FONTES-DE-ENTRADA completo
2. Inngest 14 estágios
3. Kommo integration
4. Sheets integration
5. WhatsApp validation

---

## 🔗 REFERÊNCIAS

- Diagnóstico bloqueador: `PRD-META-WHATSAPP-LOGS-V1.md`
- Arquitectura completa: `ARQUITETURA-MOTOR-DE-LEADS.md`
- Navegação: `PLANO-REORGANIZACAO-CLIENT-CENTRIC.md`
- Migraçao N8N: `PLANO-EXECUCAO-MODULO-LEADS.md`

---

**Última atualização:** 2026-07-14 15:10 GMT-3  
**Salvo em:** `/docs/RASTREAMENTO-PRDS-IMPLEMENTACAO.md`
