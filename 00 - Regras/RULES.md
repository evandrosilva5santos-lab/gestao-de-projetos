# 🚀 START-SYSTEM RULES: THE GOLDEN STANDARD

Este é o documento principal de regras e filosofia de desenvolvimento aplicável a **qualquer aplicativo** construído com a arquitetura Start-System. 

## 🏆 REGRAS DE OURO (NUNCA QUEBRE)

### 1. NUNCA PROGRAME SEM UM PRD
Nenhum código, tela ou módulo deve ser iniciado sem que o documento `PRD.md` (Product Requirements Document) da funcionalidade esteja **aprovado**. O PRD dita o objetivo, os requisitos técnicos, o esquema de banco de dados e a UI esperada.

### 2. ARQUITETURA NEXT.JS APP ROUTER & FEATURE-SLICED
Nós utilizamos uma arquitetura baseada em features. O roteamento acontece na pasta `/app` e toda a lógica de negócio é encapsulada na pasta `/features`.
- **NÃO** use uma pasta genérica `/src/modules/` antiquada.
- **NÃO** misture lógica de uma feature dentro de outra. Use composição e injeção de dependências.

### 3. SINGLE SOURCE OF TRUTH (ESTADO EFICIENTE)
- **Servidor/Banco:** Use **TanStack Query** para gerenciar dados do backend (cache, optimistic updates). Ele é a única fonte da verdade.
- **Local/UI:** Use **Zustand** ou **React Context** estritamente para estados efêmeros da interface (ex: modais abertos, abas selecionadas).
- **PROIBIDO:** Usar `window.dispatchEvent` ou gerenciar eventos mutáveis puros de Javascript. Use a reatividade do React e websockets (Supabase Realtime) para comunicação em tempo real.

### 4. INDEPENDÊNCIA E ENCAPSULAMENTO DE MÓDULOS (FEATURES)
Cada feature (dentro de `/features/[nome-do-modulo]`) deve ser autossuficiente e conter:
- `components/` (componentes exclusivos do módulo)
- `api/` ou `actions/` (Server Actions ou endpoints)
- `hooks/` (Hooks do TanStack Query)
- `README.md` (Documentação detalhada de como a feature funciona)

### 5. CONFIGURAÇÃO DINÂMICA (SaaS MULTI-TENANT)
Este não é um sistema estático. É um SaaS.
- **NUNCA** chumbe dados de clientes, cores fixas ou URLs de banco de dados no código.
- Configurações do sistema devem vir de **variáveis de ambiente** (`.env.local`).
- Customizações visuais e regras de negócio de clientes específicos devem vir do **Banco de Dados** (ex: tabela `organization_settings`).

### 6. AI-FIRST DE VERDADE
Sempre considere como a Inteligência Artificial pode potencializar a feature. 
- Mantenha a inteligência centralizada na pasta `/lib/ai/`.
- Construa "Tools" (ferramentas) no Vercel AI SDK para permitir que os agentes de IA leiam e executem ações autônomas no banco de dados.

### 7. BARREIRA DE IMPORTAÇÃO (FEATURES PORTÁVEIS)
Uma feature só é "copiável para outro app" se ela **não conhecer** nenhuma outra feature. A regra #4 diz *"não misture features"* — esta define **o mecanismo**.

**Uma pasta `features/[X]/` só pode importar de:**
1. **Si mesma** (`./` e subpastas).
2. **`components/`** — UI global compartilhada (`ui/`, `icons/`, `layout/`).
3. **`lib/`** — serviços e infraestrutura (supabase, ai, providers…).
4. **`features/_shared/`** — primitivos reutilizados por mais de uma feature.

**PROIBIDO:** `import ... from "@/features/OUTRA_FEATURE"`. Se duas features precisam da mesma coisa (ex: um `ConnectionCard`, um modal de integração), essa coisa **sobe para `features/_shared/`** — nunca uma feature importa da outra. Import cruzado entre features cria dependência circular e destrói a portabilidade.

**Reforço automático (recomendado):** ESLint `no-restricted-imports` com padrão `@/features/*/!(index)` bloqueando import de arquivos internos de outra feature.

**API pública via `index.ts`:** cada feature e cada módulo `_shared` expõe só o que é público num `index.ts` (barrel). Ninguém importa arquivo interno direto — importa do barrel (`@/features/_shared/integrations`). Isso permite refatorar o interior sem quebrar quem consome.
