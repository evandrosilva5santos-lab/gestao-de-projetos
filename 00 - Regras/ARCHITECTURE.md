# 🏗️ START-SYSTEM ARCHITECTURE

A arquitetura oficial para aplicações de alto desempenho. Combinamos **Next.js 16 (App Router)**, **Supabase (PostgreSQL + Auth)**, e o **Vercel AI SDK**.

## ESTRUTURA DE PASTAS (FEATURE-SLICED DESIGN)

A estrutura do repositório deve obrigatoriamente seguir a seguinte organização:

```text
/
├── app/                  # Roteamento (Next.js App Router)
│   ├── (protected)/      # Rotas privadas (exige login Supabase)
│   ├── (public)/         # Rotas públicas (landing pages, login)
│   └── api/              # Endpoints e Webhooks (Route Handlers)
│
├── features/             # Módulos de Negócio Independentes (O CORAÇÃO DO APP)
│   ├── [feature-name]/   # Ex: deals, contacts, messaging
│   │   ├── components/   # UI específica desta feature
│   │   ├── actions.ts    # Server Actions do Next.js
│   │   ├── hooks.ts      # TanStack Query Hooks (useQuery, useMutation)
│   │   └── README.md     # Documentação da feature
│
├── components/           # Componentes UI Compartilhados e Globais
│   ├── ui/               # Biblioteca de componentes (shadcn/ui + Radix)
│   └── layout/           # Sidebar, Navbar, Wrappers
│
├── lib/                  # Serviços e Configurações Core
│   ├── supabase/         # Clientes Supabase (Browser, Server, Admin/Service Role)
│   ├── ai/               # Vercel AI SDK, Agentes, Prompts e Tools
│   └── query/            # Configuração do TanStack Query Client
│
├── context/              # React Contexts globais (ex: AuthContext, ThemeContext)
└── types/                # Definições de tipagem global TypeScript
```

## COMUNICAÇÃO DE DADOS (DATA FETCHING)

1. **Server Components:** Quando possível, faça o fetch de dados iniciais direto nos Server Components (Next.js) para SEO e primeira carga rápida.
2. **Client Components:** Para interatividade e mutações complexas, utilize o **TanStack Query**.
3. **Mutações (POST/PUT/DELETE):** Devem ser feitas através de **Server Actions** (`"use server"`) chamadas pelas mutações do TanStack Query, garantindo tipagem de ponta a ponta e segurança de execução no servidor.
4. **Tempo Real:** Para sincronização ao vivo, utilize o **Supabase Realtime** assinando os canais do PostgreSQL.

## AUTENTICAÇÃO E SEGURANÇA (SUPABASE)
- O middleware (`middleware.ts`) na raiz deve proteger as rotas da pasta `(protected)/` verificando a sessão do Supabase.
- Row Level Security (RLS) no PostgreSQL do Supabase é OBRIGATÓRIO. Todo banco de dados deve ser protegido no nível da linha, geralmente filtrando pelo `organization_id` (para arquiteturas Multi-tenant).
