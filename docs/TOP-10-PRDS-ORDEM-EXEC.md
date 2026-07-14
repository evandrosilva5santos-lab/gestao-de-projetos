---
name: top-10-prds-ordem-exec
description: TOP 10 PRDs em ordem de execução (prioridade + bloqueadores)
metadata:
  type: reference
  createdAt: "2026-07-14 15:15 GMT-3"
  format: "Tabela simples - copiar pra UPA"
---

# 🎯 TOP 10 PRDs — ORDEM DE IMPLEMENTAÇÃO

## 📊 TABELA GERAL

| Rank | PRD / Tarefa | O que é | Status | % Feito | Tempo | Bloqueador? | Data Est. | Próximo Passo |
|------|--------------|---------|--------|---------|-------|------------|-----------|---------------|
| 1️⃣ | **BLOCKER: Webhook Meta → Inngest** | Conectar Meta webhook ao sistema | 🔴 BLOCKED | 0% | 4-5h | 🔴 SIM | 2026-07-15 | Testar webhook com curl |
| 2️⃣ | **CRÍTICO: Wiring ClientsListScreen** | Conectar client selection ao shell | 🟡 PAUSED | 50% | 30min | 🔴 SIM | 2026-07-15 (hoje) | Adicionar estado `selectedClient` |
| 3️⃣ | **PRD-FONTES-DE-ENTRADA (Fase B)** | Descoberta automática formulários | 🟡 DRAFT | 20% | 6-8h | 🔴 SIM (TIER 1) | 2026-07-21 | Criar `gestao_leads_source_forms` table |
| 4️⃣ | **Inngest: 14 Estágios Motor** | Processar lead completo | 🟡 SKELETON | 40% | 8-10h | 🔴 SIM | 2026-07-22 | Implementar normalize → assign → integrate pipeline |
| 5️⃣ | **Kommo CRM Integration** | Enviar leads pro Kommo | 🟢 80% | 80% | 4-5h | 🟡 MÉDIO | 2026-07-19 | Field mapping dinâmico |
| 6️⃣ | **Google Sheets Integration** | Backup de leads em planilha | 🟢 80% | 80% | 3-4h | 🟡 MÉDIO | 2026-07-20 | Column mapping dinâmico |
| 7️⃣ | **WhatsApp Integration** | Notificar vendedor + grupo | ⚠️ 50% | 50% | 2-3h | 🟡 MÉDIO | 2026-07-19 | Validar `groupJid` |
| 8️⃣ | **ClientPortal (visão do cliente)** | Cliente vê seus leads em tempo real | 🔴 TODO | 0% | 4-5h | 🟢 BAIXO | 2026-07-25 | Criar `/app/(protected)/portal/leads` |
| 9️⃣ | **Dashboard de Métricas** | Gráficos + KPIs pra admin | 🔴 TODO | 0% | 3-4h | 🟢 BAIXO | 2026-07-26 | Cards: volume, taxa sucesso, falhas |
| 🔟 | **Refactor Nav Client-Centric** | Limpar UI, remover CRM & Funil | ⚠️ 30% | 30% | 2-3h | 🟢 BAIXO | 2026-07-18 | Remover items ComingSoon |

---

## 🚨 BLOCKERS CRÍTICOS (FAZER AGORA)

### 1️⃣ Webhook Meta → Inngest
```
Meta envia lead
   ↓
❌ /app/api/webhooks/meta NÃO recebe
   ↓
❌ Inngest não dispara job
   ↓
❌ Lead não processa
   ↓
❌ WhatsApp não chega
   ↓
❌ Logs não aparecem
```

**Ação:** 
- [ ] Validar webhook com curl (30 min)
- [ ] Conectar webhook route → Inngest (1h)
- [ ] Testar end-to-end (30 min)

**Responsável:** Você  
**Deadline:** Hoje (2026-07-14) antes das 18h

---

### 2️⃣ Wiring ClientsListScreen
```
User clica em cliente
   ↓
❌ Callback `onSelect` não passa contexto
   ↓
❌ ClientWorkspaceShell NÃO renderiza
   ↓
❌ User fica na mesma tela
```

**Ação:**
- [ ] Adicionar estado `selectedClient` em LeadsDashboardShell (5 min)
- [ ] Passar callback `onSelect` (5 min)
- [ ] Renderizar shell quando selecionado (5 min)

**Responsável:** Você  
**Deadline:** Hoje (2026-07-14) antes das 18h

---

## 🎯 PRÓXIMO TIER (Após blockers)

### Tier 1: Infraestrutura (FAZER SEMANA PRÓXIMA)

| # | PRD | Tarefas | Tempo | Deadline |
|---|-----|---------|-------|----------|
| 3 | PRD-FONTES-DE-ENTRADA | Create `gestao_leads_source_forms` table + Provider Meta + UI | 6-8h | 2026-07-21 |
| 4 | Inngest Motor Completo | 14 estágios (normalize → assign → integrate) | 8-10h | 2026-07-22 |

### Tier 2: Integrações (FAZER FINAL DA SEMANA)

| # | PRD | Tarefas | Tempo | Deadline |
|---|-----|---------|-------|----------|
| 5 | Kommo | Field mapping dinâmico, deal creation | 4-5h | 2026-07-19 |
| 6 | Sheets | Column mapping dinâmico, quota handling | 3-4h | 2026-07-20 |
| 7 | WhatsApp | Validar grupo, retry, template | 2-3h | 2026-07-19 |

### Tier 3: Experiência (FAZER PRÓXIMA SEMANA)

| # | PRD | Tarefas | Tempo | Deadline |
|---|-----|---------|-------|----------|
| 8 | ClientPortal | Cliente vê seus leads | 4-5h | 2026-07-25 |
| 9 | Métricas | Dashboard com gráficos | 3-4h | 2026-07-26 |
| 10 | Navegação | Remover items desnecessários | 2-3h | 2026-07-18 |

---

## 📈 TIMELINE VISUAL

```
HOJE (2026-07-14)
├─ 🔴 BLOCKER 1: Webhook (4-5h)
└─ 🔴 BLOCKER 2: Wiring (30 min)

AMANHÃ (2026-07-15)
└─ Testar end-to-end + deploy

SEMANA (2026-07-16 a 2026-07-22)
├─ PRD-FONTES-DE-ENTRADA (6-8h)
├─ Inngest 14 estágios (8-10h)
├─ Kommo final (4-5h)
├─ Sheets final (3-4h)
└─ WhatsApp final (2-3h)

PRÓXIMA SEMANA (2026-07-23+)
├─ ClientPortal (4-5h)
├─ Métricas (3-4h)
└─ Navegação cleanup (2-3h)
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

### BLOCKER 1: Webhook (HOJE)
- [ ] curl test retorna 200 OK
- [ ] Inngest dashboard mostra evento recebido
- [ ] Lead aparece em `gestao_leads` table
- [ ] WhatsApp vendedor recebe mensagem
- [ ] Logs aparecem em dashboard

### BLOCKER 2: Wiring (HOJE)
- [ ] User clica em cliente
- [ ] ClientWorkspaceShell renderiza
- [ ] 5 abas aparecem (Visão, Fontes, Fila, Destinos, Logs)
- [ ] Breadcrumb mostra cliente selecionado
- [ ] Volta pra lista funciona

### Tier 1: Fontes (2026-07-16 a 2026-07-21)
- [ ] Table `gestao_leads_source_forms` existe
- [ ] Provider Meta: validateCredentials funciona
- [ ] listPages retorna páginas reais
- [ ] listForms retorna formulários reais
- [ ] Config form → workspace funciona

### Tier 1: Inngest (2026-07-16 a 2026-07-22)
- [ ] Webhook dispara função
- [ ] Normalize funciona (telefone com 55)
- [ ] Assign funciona (round robin)
- [ ] Integrations disparam em paralelo
- [ ] Logs salvam cada etapa
- [ ] Retry automático funciona

---

## 🎯 VOCÊ AQUI ESTÁ

```
🟢 ✅ Meta OAuth conectada
🟢 ✅ Evolution WhatsApp code pronto
🟢 ✅ Inngest infrastructure
🟢 ✅ Audit logs table
🟡 ⚠️ UI parcialmente pronta

🔴 ❌ Webhook recebendo (HOJE)
🔴 ❌ Inngest processando (HOJE)
🔴 ❌ Logs aparecendo (HOJE)
🔴 ❌ Navigation funcionando (HOJE)
```

---

**Pronto pra começar?** 🚀

Próximo passo: Testare webhook Meta com curl

