# 🏗️ PLANO DE REFATORAÇÃO - Feature-Sliced Compliance

## 📊 DIAGNÓSTICO

### ✅ JÁ CONFORME
```
app/
├── (protected)/     ✅ Rotas protegidas
├── (public)/        ✅ Rotas públicas
└── api/             ✅ Endpoints + Webhooks

features/
├── _shared/         ✅ Componentes e ações compartilhadas
├── leads/           ✅ Feature principal
└── integration-hub/ ✅ Integrações

components/         ✅ UI compartilhada (shadcn/ui)
lib/                ✅ Core utilities
context/            ✅ React Contexts
types/              ✅ TypeScript global
```

### ⚠️ NÃO CONFORME

#### Problema 1: `features/leads/lib/`
**Atual:**
```
features/leads/
├── lib/
│   └── agency-os-theme.ts
├── components/
├── actions.ts
└── README.md
```

**Esperado (conforme ARCHITECTURE.md):**
```
features/leads/
├── components/
├── actions.ts
├── hooks.ts        ← FALTA
└── README.md
```

**Ação:** Mover `features/leads/lib/agency-os-theme.ts` para `lib/themes/agency-os.ts`

#### Problema 2: Falta `hooks.ts` em `features/leads/`
**Esperado:**
```
features/leads/
├── components/
├── actions.ts
├── hooks.ts        ← ADICIONAR (TanStack Query hooks)
└── README.md
```

**Ação:** Criar `features/leads/hooks.ts` com hooks de:
- `useLeadsQuery()` - Fetch leads
- `useCreateLeadMutation()` - Criar lead
- `useClientWorkspaceQuery()` - Fetch workspace
- Etc.

#### Problema 3: `features/integration-hub/` incompleto
**Atual:**
```
features/integration-hub/
├── components/
│   └── IntegrationHubTab.tsx
└── README.md
```

**Esperado:**
```
features/integration-hub/
├── components/
├── actions.ts      ← FALTA
├── hooks.ts        ← FALTA
└── README.md
```

**Ação:** Extrair Server Actions e Hooks para arquivos dedicados

---

## 🚀 PLANO DE EXECUÇÃO

### FASE 1: Refactoring `features/leads/` (30 min)

**1.1 - Mover tema**
```bash
# Criar lib/themes/
mkdir -p lib/themes

# Mover arquivo
mv features/leads/lib/agency-os-theme.ts lib/themes/agency-os.ts

# Remover pasta vazia
rmdir features/leads/lib

# Atualizar imports em components/
sed -i '' 's|../lib/agency-os-theme|../../lib/themes/agency-os|g' features/leads/components/*.tsx
```

**1.2 - Criar `features/leads/hooks.ts`**
Extrair de `components/*.tsx`:
- Custom hooks para queries
- Custom hooks para mutations
- Hooks para gerenciamento de estado

**1.3 - Validar `features/leads/actions.ts`**
✅ Já existe e está bem organizado

**1.4 - Validar `features/leads/README.md`**
✅ Já existe

---

### FASE 2: Refactoring `features/integration-hub/` (20 min)

**2.1 - Extrair Server Actions**
- Criar `features/integration-hub/actions.ts`
- Mover lógica de banco de dados

**2.2 - Extrair Custom Hooks**
- Criar `features/integration-hub/hooks.ts`
- Mover TanStack Query queries/mutations

**2.3 - Validar Components**
- `features/integration-hub/components/`

**2.4 - Criar README.md**
- Documentar propósito da feature
- Listar componentes disponíveis

---

### FASE 3: Outros Features (Futura)

Se novos features forem criados, garantir estrutura:
```
features/[feature-name]/
├── components/      # UI específica
├── actions.ts       # Server Actions
├── hooks.ts         # TanStack Query
├── utils.ts         # (opcional) Helpers
└── README.md        # Documentação
```

---

## 📋 CHECKLIST

- [ ] **1.1** - Mover `features/leads/lib/` para `lib/themes/`
- [ ] **1.2** - Criar `features/leads/hooks.ts` com queries/mutations
- [ ] **1.3** - Validar `features/leads/actions.ts` completo
- [ ] **1.4** - Validar `features/leads/README.md` completo
- [ ] **2.1** - Criar `features/integration-hub/actions.ts`
- [ ] **2.2** - Criar `features/integration-hub/hooks.ts`
- [ ] **2.3** - Validar components
- [ ] **2.4** - Criar `features/integration-hub/README.md`
- [ ] **FINAL** - Rodar build e testar
- [ ] **COMMIT** - Git commit com refactoring

---

## ✅ RESULTADO FINAL

```
features/
├── _shared/
│   ├── integrations/
│   │   ├── actions.ts
│   │   ├── ConnectionCard.tsx
│   │   ├── NewIntegrationModal.tsx
│   │   └── index.ts
│
├── leads/
│   ├── components/           ✅
│   │   ├── ClientsListScreen.tsx
│   │   ├── ClientWorkspaceShell.tsx
│   │   ├── ClientLogsTab.tsx
│   │   ├── OverviewTab.tsx
│   │   ├── SellersQueueTab.tsx
│   │   ├── ClientSourcesTab.tsx
│   │   ├── ClientDestinationsTab.tsx
│   │   ├── CreateClientModal.tsx
│   │   └── ...
│   ├── actions.ts            ✅
│   ├── hooks.ts              ← NOVO
│   ├── README.md             ✅
│
├── integration-hub/
│   ├── components/
│   │   └── IntegrationHubTab.tsx
│   ├── actions.ts            ← NOVO
│   ├── hooks.ts              ← NOVO
│   └── README.md             ← NOVO

lib/
├── themes/                   ← NOVO
│   └── agency-os.ts
├── supabase/
├── ai/
└── query/
```

---

**Estimativa:** 50 minutos de trabalho  
**Risco:** Baixo (apenas refactoring, sem lógica nova)  
**Benefício:** Projeto 100% conforme ARCHITECTURE.md

