# 📋 PRD: Fontes de Entrada & Integrações

## 1. Visão Geral
**Objetivo:** Conectar a Meta (e futuramente outras origens) ao sistema de forma global e mapear os formulários capturados para os respectivos Workspaces (Clientes).

## 2. Abordagem (Admin-centric)
**Regra de Ouro:** O Admin cadastra o Token do Facebook Business UMA única vez na "Central de Integrações". Esse token (gerado via System User) tem acesso às páginas dos clientes. 
Na aba "Fontes de Entrada", o Admin vê os formulários carregados e atrela cada formulário a um Workspace específico para que a "Rodada da Vez" funcione.

## 3. Telas Envolvidas

### A. Central de Integrações (`/central-integracoes`)
- **Card da Conexão:** Mostra as credenciais salvas no sistema (ex: Token do Meta).
- **Ações:** O Admin pode validar e renovar o token aqui. Não há necessidade de input repetitivo de IDs ou chaves em cada cliente.

### B. Fontes de Entrada (`/fontes-de-entrada`)
- **Mapeamento:** Uma tabela onde a origem (Formulário do Facebook X) é vinculada ao Cliente (Workspace Y).
- **Distribuição:** A partir daqui, quando um lead chegar deste formulário, o Motor sabe que deve enviá-lo para a Rodada da Vez do Workspace Y.

## 4. Tabelas

**`gestao_leads_sources`**
- Conexão Nível Agência.
- Armazena as credenciais (Token da Meta).

**`gestao_leads_source_forms`**
- Formulários lidos da Graph API.

**`gestao_leads_form_configs`**
- Liga o formulário (`source_form_id`) a um cliente específico (`workspace_id`).

## 5. Critérios de Aceite
- [ ] Central de Integrações permite adicionar token Meta uma vez (nível global).
- [ ] O sistema lista os formulários disponíveis para esse token.
- [ ] O Admin consegue atrelar o formulário a um Workspace.
- [ ] Leads recebidos encontram o Workspace correto através do `gestao_leads_form_configs`.
