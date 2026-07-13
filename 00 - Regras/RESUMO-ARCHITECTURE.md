# 📋 Resumo — START-SYSTEM ARCHITECTURE

> Resumo executivo do arquivo [ARCHITECTURE.md](ARCHITECTURE.md)

## 🏗️ Stack Oficial
- **Next.js 16** (App Router)
- **Supabase** (PostgreSQL + Auth)
- **Vercel AI SDK**

## 📂 Estrutura (Feature-Sliced Design)

```text
├── app/              # Roteamento + Rotas protegidas/públicas
│   ├── (protected)/  # Exige login Supabase
│   ├── (public)/     # Landing pages, login
│   └── api/          # Endpoints e Webhooks
├── features/         # Módulos de negócio independentes ⭐
│   └── [feature-name]/
│       ├── components/     # UI específica da feature
│       ├── actions.ts      # Server Actions
│       ├── hooks.ts        # TanStack Query
│       └── README.md       # Documentação
├── components/       # UI compartilhada (shadcn/ui + Radix)
│   ├── ui/
│   └── layout/       # Sidebar, Navbar, Wrappers
├── lib/              # Core
│   ├── supabase/     # Clientes (Browser, Server, Admin)
│   ├── ai/           # Vercel AI SDK, Agentes, Prompts
│   └── query/        # TanStack Query Client
├── context/          # React Contexts globais
└── types/            # TypeScript global
```

## 🔄 Data Fetching
1. **Server Components** → fetch inicial (SEO + primeira carga rápida)
2. **Client Components** → TanStack Query (interatividade e mutações complexas)
3. **Mutações (POST/PUT/DELETE)** → Server Actions (`"use server"`) chamadas pelas mutações do TanStack Query
4. **Tempo Real** → Supabase Realtime (assinando canais do PostgreSQL)

## 🔐 Segurança (OBRIGATÓRIO)
- Middleware (`middleware.ts`) na raiz protege rotas `(protected)/` verificando a sessão do Supabase
- **Row Level Security (RLS)** no PostgreSQL é obrigatório
- Filtrar pelo `organization_id` (arquiteturas Multi-tenant)
