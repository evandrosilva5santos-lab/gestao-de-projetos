# 📋 PRD: [Nome da Funcionalidade / Aplicativo]

## 1. Visão Geral
**Status:** [Draft / Em Revisão / Aprovado]
**Objetivo Principal:** O que esta feature faz e que problema ela resolve?

## 2. Casos de Uso (User Stories)
- Como [Perfil do Usuário], eu quero [Ação] para [Resultado].
- Como [Admin], eu quero [Ação] para [Resultado].

## 3. Requisitos Arquiteturais (Obrigatório seguir ARCHITECTURE.md)
**Caminho da Feature:** `/features/[nome-da-feature]`
**Rotas Envolvidas:** 
- `/app/(protected)/[rota]`
- `/app/api/[endpoint]` (Se houver webhooks ou integrações externas)

## 4. Banco de Dados e Supabase (Esquema)
Quais tabelas serão criadas ou afetadas?
*Aviso: Toda tabela deve possuir a coluna `organization_id` e RLS ativado.*

**Tabela: `nome_da_tabela`**
| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| `id` | UUID | Sim | PK, default `uuid_generate_v4()` |
| `organization_id` | UUID | Sim | FK para `organizations.id` |
| `created_at` | Timestamptz | Sim | Data de criação |

**Políticas RLS (Row Level Security):**
- Leitura: Usuários apenas onde `organization_id` bate com o seu `auth.jwt()`.
- Escrita: Usuários apenas onde `organization_id` bate com o seu `auth.jwt()`.

## 5. UI/UX e Design (Obrigatório seguir DESIGN.md)
- Descreva as telas, modais ou painéis (drawers) necessários.
- A interface precisará de atualizações em tempo real (Supabase Realtime)?
- Como será a experiência de "Loading" ou "Skeleton" do TanStack Query?

## 6. Integração com Inteligência Artificial
Como a IA pode aprimorar essa funcionalidade? 
- Serão criadas "Tools" (Ferramentas) em `/lib/ai/tools.ts` para que o agente possa interagir com esta feature?

## 7. Critérios de Aceite
- [ ] A feature está isolada na sua respectiva pasta em `/features/`.
- [ ] O banco de dados está protegido com RLS por `organization_id`.
- [ ] O arquivo `README.md` da feature foi preenchido.
- [ ] Nenhuma cor ou dado de cliente está hardcoded no código.
