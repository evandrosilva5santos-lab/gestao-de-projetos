# 📘 Feature: [Nome da Feature]

## Visão Geral
Descreva brevemente o que este módulo faz. Este arquivo deve ser salvo como `README.md` na raiz da pasta da feature (ex: `/features/contacts/README.md`).

## Estrutura Interna
- `components/`: Componentes visuais exclusivos desta feature.
- `actions.ts`: Server Actions (ex: `createContact`, `updateContact`).
- `hooks.ts`: Hooks do TanStack Query que envelopam as actions (ex: `useContacts()`).

## Fluxo de Dados
Explique como os dados são consumidos. 
*Exemplo: O componente `ContactList` chama o hook `useContacts()`, que por sua vez aciona o Server Action `getContacts()` acessando o cliente do Supabase no lado do servidor.*

## Dependências Externas
Esta feature depende de algum outro módulo ou serviço externo (ex: WhatsApp API, Stripe)?
- [ ] Não
- [ ] Sim (Liste-os)

## 📦 Contrato de Portabilidade (o que copiar junto)
> Preencha para que qualquer um consiga **arrastar esta feature para outro app** sem quebrar. Regra de Ouro #7: a feature nunca importa de outra feature.

- **Módulos `features/_shared/` usados:** _(ex: `_shared/integrations`)_ — copiar junto.
- **UI global de `components/`:** _(ex: `components/icons`, `components/ui/dialog`)_ — garantir que existam no destino.
- **Serviços de `lib/`:** _(ex: `lib/supabase/client`, `lib/leads/providers/meta`)_ — copiar junto.
- **Tabelas Supabase / migrations:** _(ex: `gestao_leads_sellers`, RPC `assign_next_seller`)_ — rodar as migrations no destino.
- **Variáveis de ambiente (`.env`):** _(ex: `META_APP_SECRET`, `EVOLUTION_URL`)_.
- **Import cruzado de outra feature?** ✅ Nenhum (obrigatório). Se houver, é dívida técnica a resolver antes de considerar a feature portável.

## Notas de Implementação
Qualquer consideração técnica relevante para futuros desenvolvedores ou agentes de IA que venham a fazer manutenção nesta funcionalidade.
