# 🗄️ DATABASE NAMING: Convenção de Nomenclatura de Tabelas (Supabase Multi-App)

## Contexto
Todos os apps da pasta `00 - Apps/` compartilham **UM ÚNICO projeto Supabase**. Sem uma convenção de nomes, tabelas de apps diferentes (Gestão, Jurídico, Financeiro...) colidem ou ficam impossíveis de identificar só olhando a lista de tabelas no dashboard/schema.

Identificadores SQL não aceitam espaços nem colchetes sem aspas duplas — e identificador entre aspas exige escaping em toda query, para sempre. Por isso a notação `[APP] {MÓDULO} nome` é só a forma de *pensar* o nome; o nome real no banco é sempre **snake_case minúsculo**.

## Regra principal

```
{app}_{modulo}_{entidade}
```

- Tudo em `snake_case` minúsculo.
- `{entidade}` no plural.
- Exemplo: App Jurídico, módulo Contratos, tabela de cláusulas → `juridico_contratos_clausulas`.

## Slugs de app (fixos — não inventar variação; adicionar linha aqui a cada novo app)

| App (pasta em `00 - Apps/`) | Slug |
|---|---|
| Gestão de Projetos | `gestao` |
| *(próximo app criado)* | *(definir aqui antes de criar a 1ª tabela)* |

## Exceção 1 — Tabela central do módulo (evitar repetição)

Se a tabela representa o **objeto central** do módulo (o módulo *é* essa entidade), **omite-se a repetição do nome**:

```
{app}_{modulo}
```

Exemplo: módulo "Leads" do app Gestão → a tabela principal de leads é `gestao_leads` (**não** `gestao_leads_leads`). Todas as tabelas **de apoio** desse mesmo módulo seguem a regra cheia: `gestao_leads_sellers`, `gestao_leads_destinations`, `gestao_leads_audit_logs`.

## Exceção 2 — Tabelas CORE (compartilhadas entre apps)

Tenant, usuários e permissões são conceito de **plataforma**, não de um app específico — um mesmo workspace/cliente pode usar Gestão *e* Jurídico ao mesmo tempo sob o mesmo Supabase. Essas tabelas **não levam prefixo de app**:

```
core_{entidade}
```

Exemplos: `core_workspaces`, `core_workspace_users`.

## Exceção 3 — Tabela de app sem módulo específico

Se a tabela pertence ao app mas não a um módulo de negócio (ex.: settings gerais do app) → `{app}_{entidade}`, sem a parte do módulo.

## Tabela de tradução (aplicada em 2026-07-13)

| Nome antigo | Nome novo | Motivo |
|---|---|---|
| `workspaces` | `core_workspaces` | Tenant é conceito de plataforma (Exceção 2) |
| `workspace_users` | `core_workspace_users` | Idem |
| `leads` | `gestao_leads` | Tabela central do módulo Leads (Exceção 1) |
| `lead_audit_logs` | `gestao_leads_audit_logs` | Tabela de apoio do módulo Leads |
| `lead_distribution_rules` | `gestao_leads_distribution_rules` | Tabela de apoio do módulo Leads |

## Checklist antes de criar qualquer tabela nova
- [ ] O slug do app já está na tabela acima? Se não, adicionar antes de prosseguir.
- [ ] É conceito de plataforma (tenant/usuário)? → `core_*`.
- [ ] É o objeto central do módulo? → `{app}_{modulo}` sem repetir.
- [ ] Senão → `{app}_{modulo}_{entidade}` plural.
