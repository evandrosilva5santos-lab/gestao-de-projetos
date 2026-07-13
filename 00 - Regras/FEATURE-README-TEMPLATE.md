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

## Notas de Implementação
Qualquer consideração técnica relevante para futuros desenvolvedores ou agentes de IA que venham a fazer manutenção nesta funcionalidade.
