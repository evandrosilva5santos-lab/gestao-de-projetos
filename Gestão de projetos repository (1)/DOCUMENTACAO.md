# Agency OS — Documentação do Produto

> Documento de referência de tudo que foi construído neste projeto de design.
> Serve para orientar qualquer pessoa — ou outra IA — a entender **o que existe, para que serve cada parte e o que ainda falta**, antes de continuar o desenvolvimento.

---

## 1. Visão geral

**Agency OS** é a plataforma de gestão e **processamento de leads** de uma agência de marketing (multi-cliente). O objetivo central do produto é **substituir as automações frágeis do n8n** por um sistema único, confiável e auditável.

- **Origem do design:** recriado a partir do repositório Next.js do usuário (`gestao-de-projetos`), que tinha apenas uma tela — o dashboard "Motor de Leads" (Next.js + shadcn/ui + Tailwind v4).
- **O coração do produto é o _Motor de Processamento de Leads_ (Lead Engine).** Todos os outros módulos (CRM, Clientes, Regras, etc.) são **consumidores** desse motor.
- **Natureza atual:** protótipo de **design interativo em alta fidelidade** (HTML/Design Component). A lógica de negócio é simulada no front-end — ainda **não há backend, banco de dados nem chamadas reais de API**.

### Arquivos entregues

| Arquivo | O que é |
|---|---|
| `Agency OS.dc.html` | **Aplicação principal** — todos os módulos, interativa, com tema claro/escuro e responsiva. É o arquivo que evolui. |
| `Motor de Leads.dc.html` | Recriação fiel (pixel-perfect) da **única tela** que existia no código Next.js original. Mantido como referência do ponto de partida. |
| `DOCUMENTACAO.md` | Este documento. |

---

## 2. Identidade visual (design system aplicado)

Mantém o visual do código original do usuário (shadcn/ui), **não** o design system START INC. (decisão explícita do usuário).

- **Tipografia:** Geist (UI) + Geist Mono (dados/tokens/IDs).
- **Cor de destaque:** índigo (`#4f46e5` claro / `#6366f1` escuro).
- **Neutros:** paleta slate no claro; zinc no escuro.
- **Tema claro e escuro:** alternável no topo. Implementado com variáveis CSS (`--bg`, `--card`, `--fg`, `--accent`, tokens de status, etc.) trocadas em runtime.
- **Responsivo:** a sidebar vira gaveta (drawer) com botão hambúrguer em telas < 900px; grids se reorganizam.
- **Cores de status/origem:** Meta = azul, WhatsApp = verde, Landing Page = roxo, Google Ads = laranja; sucesso = verde, erro = vermelho/rosa, processando = azul.

---

## 3. Arquitetura conceitual

```
        ┌──────────────── CENTRAL DE INTEGRAÇÕES ────────────────┐
        │  Meta · Google · Kommo · Evolution API · Google Sheets  │
        │  (1 conexão/token no nível do sistema; nunca do cliente)│
        └─────────────────────────────────────────────────────────┘
                         │  1 token → N páginas/formulários
                         ▼
        Cada Formulário (Form ID) → mapeado a 1 Workspace
                         │
                         ▼  webhook chega → lê Form ID → acha Workspace
        ┌────────────────────────────────────┐
        │   MOTOR DE PROCESSAMENTO (Lead Engine) │
        │   toda a regra de negócio vive aqui    │
        └────────────────────────────────────┘
                         │
                         ▼
        CRM (Kommo) · Google Sheets · WhatsApp · APIs
              (apenas destinos / adapters)
```

**Princípios de arquitetura (representados na UI):**
1. **Fluxo único** — leads de qualquer origem passam pelo mesmo pipeline.
2. **Idempotência** — cada Lead ID é processado uma única vez (sem duplicidade de lead, mensagem, CRM ou planilha).
3. **Banco é a fonte oficial** — Google Sheets deixa de ser base; vira destino opcional. Se uma integração cair, o lead continua salvo.
4. **Integrações desacopladas** — cada serviço externo é um **adapter/provider** plugável; adicionar um provedor novo não mexe no motor.
5. **Distribuição transacional** — a "Rodada da Vez" vive no sistema com lock de concorrência (nunca dois vendedores no mesmo lead).
6. **Integrações no nível do sistema** — a conexão (token) é cadastrada **uma vez na Central de Integrações** e reutilizada por N workspaces. O cliente **nunca cadastra token nem ID**; apenas consome uma conexão existente. Isso evita duplicação de token, centraliza a manutenção e escala para centenas de clientes.
7. **Roteamento por Form ID (índice O(1))** — cada Formulário é mapeado a exatamente 1 Workspace. Quando o webhook chega, o sistema lê o `Form ID`, encontra o Workspace pelo índice único e carrega a config — sem regra manual. Esse índice único também sustenta a idempotência.

---

## 4. Módulos e telas

A sidebar agrupa os módulos em três seções: **MOTOR DE LEADS**, **PRINCIPAL** e **OPERAÇÃO**.

### 4.1 MOTOR DE LEADS

#### Central de Integrações (`central`) — conexões no nível do sistema
Para que serve: cadastrar cada plataforma **uma única vez** e disponibilizá-la para os workspaces. A integração pertence ao **sistema**, não ao cliente.
Contém:
- **Provedores suportados:** Meta Business, Google Ads / Lead Forms, Google Sheets, Kommo CRM, Evolution API (extensível a TikTok, LinkedIn, RD Station, HubSpot… sem tocar no motor).
- **Cards de conexão:** nome, tipo, **status** (Conectado / Token expirado com **motivo exato**, ex.: `invalid_grant 401` / Sincronizando), **token sempre mascarado** (`EAAB••••P9D`), contadores de **formulários · páginas · workspaces**, última sincronização e último uso.
- **Ações por conexão:** Testar · Sincronizar · Renovar token · Editar · Desconectar.
- **Wizard "Nova integração" (3 passos):**
  1. **Provedor** — escolher a plataforma.
  2. **Autenticação** — dois métodos: **OAuth (login oficial)** ou **Access Token permanente (Long-Lived)**, para cobrir contas de cliente e contas da agência. Ao salvar, o sistema valida na Graph API (validade, permissões, escopos) e, em caso de erro, mostra o **motivo exato**.
  3. **Árvore Business ▸ Página ▸ Formulários** — listada automaticamente pela API (sem digitar Business ID / Page ID / Form ID); seleciona os formulários por checkbox e salva.
- **Sincronizar:** reconsulta a API e traz **novos formulários automaticamente** — não é preciso recriar a integração quando o cliente cria um formulário novo.
- **Persistência esperada ao salvar:** nome, tipo, token criptografado, Business ID/nome, Page ID/nome, Form IDs/nomes, permissões, data de sincronização, última atualização, status e workspaces vinculados.

#### Motor de Processamento (`motor`) — o coração
Para que serve: mostrar e operar o fluxo único de processamento.
Contém:
- **3 métricas:** processados hoje, idempotência (webhooks duplicados ignorados), etapas reprocessáveis.
- **Trace do lead:** linha do tempo por etapa (Captura → Normalização → Identificação → Validação & Idempotência → Rodada da Vez → Persistência → Integrações → Notificação → Logs), com timestamps e status por etapa. A etapa "Integrações" aparece com **falha isolada** (ex.: Google Sheets timeout) e botão **"Reprocessar só esta etapa"** — sem repetir o fluxo inteiro.
- **Fluxo único:** diagrama origens → MOTOR → destinos.
- **Garantias do motor:** lista dos princípios (idempotência, banco como fonte, reprocesso isolado, rodada no sistema).
- **Modelo interno do lead:** a estrutura única para a qual toda origem é convertida (ver seção 5).
- **Camada de Adapters/Providers:** lista dos adapters (MetaAdapter, GoogleAdapter, KommoAdapter, SheetsAdapter, EvolutionAdapter) marcados como fonte ou destino.

#### Fontes de Entrada (`fontes`)
Para que serve: conectar plataformas geradoras de leads e vincular cada formulário a um workspace — **sem cadastrar ID na mão**.
Contém:
- **Cards de fonte:** Meta Lead Ads (conectado: Business Manager, páginas, nº de formulários) e Google Lead Forms. Cards "Em breve": Landing Pages, Webhooks/API, WhatsApp Forms.
- **Assistente de conexão (wizard, 4 passos):**
  1. **Conexão & Token** — nome da conexão + **Token permanente (Long-Lived Access Token)**; validação na Graph API antes de salvar; escopos exigidos (`leads_retrieval`, `pages_show_list`, `pages_read_engagement`).
  2. **Business Manager / conta** — seleção em lista (via API).
  3. **Páginas** — seleção múltipla das páginas a monitorar.
  4. **Formulários** — listados automaticamente pela API.
- **Tabela Formulários → Workspace:** formulários detectados, página, workspace atual e status (Ativo / Pendente). Cada linha abre a **configuração completa do formulário (Passo 4)**.

> Observação: as conexões propriamente ditas agora vivem na **Central de Integrações** (nível do sistema). Fontes de Entrada é a visão operacional de **quais formulários estão mapeados a quais workspaces**.

#### Configuração por formulário (drawer — Passo 4)
Para que serve: cada formulário pode ter regras totalmente diferentes.
Contém: Workspace, Cliente, **Método de distribuição** (Round Robin / Peso / Manual) e **Integrações de destino** (Kommo, Google Sheets, WhatsApp/Evolution) com nota de que integrações são só destinos.

### 4.2 PRINCIPAL

#### Dashboard Motor (`dashboard`)
Visão em tempo real da distribuição. Duas visões alternáveis:
- **Auditoria:** métricas (recebidos, distribuídos, em processamento, falhas) + tabela de auditoria de leads (origem, workspace, status, vendedor, horário).
- **Performance:** distribuição por origem, leads por hora e ranking de vendedores.

#### CRM & Funil (`crm`)
Para que serve: acompanhar e mover leads pelo funil. **É um módulo consumidor do motor.**
- **Colunas (Kanban):** etapas Novos / Em contato / Qualificados / Fechados; **cada coluna soma o valor das oportunidades paradas nela**; cards **arrastáveis** entre colunas.
- **Lista:** **agrupável** por Status / Origem / Empresa / Nenhum; cada linha tem um **botão ao lado do status para mover o lead** de etapa via menu.
- Clicar num lead abre o **Detalhe do lead** (drawer).

#### Clientes / Workspaces (`clientes`)
Cada cliente é um workspace isolado (leads e vendedores próprios). Grid de cards com plano, leads/mês, vendedores e conversão + adicionar workspace. O cadastro do workspace tem abas (Geral, Vendedores, **Integrações**, etc.); na aba **Integrações** o cliente **apenas consome** uma conexão já cadastrada na Central — seleciona Provedor → Conexão existente → Página → Formulário → Vincular. **Nunca insere token.**

### 4.3 OPERAÇÃO

#### Regras de Roteamento (`regras`)
Fontes de entrada (Kommo / Planilha, incluindo **gerar planilha modelo em CSV** — funcional, baixa o arquivo), método de distribuição e regras por origem (origem → workspace → método).

#### Vendedores & Rodada (`vendedores`)
Para que serve: gerir a equipe e a "Rodada da Vez" **dentro do sistema** (não em planilha). **Escopo por cliente:** há um seletor de Cliente (Workspace) no topo — cada cliente tem a **sua própria equipe e a sua própria Rodada da Vez**; vendedores e dados de um cliente **nunca** se misturam com os de outro (base para a automação de mensagem de WhatsApp por vendedor).

**Regra Principal: Disponibilidade** — Um vendedor só entra na vez se está **disponível agora** (WhatsApp conectado + horário + dia + sem ausência). As demais regras refinam isso.

**Dias de atendimento** — cada vendedor trabalha em dias específicos (Seg–Dom). Quem não trabalha no dia é pulado automaticamente.

**Qualificação de leads** — Filtro que determina quais leads entram na Rodada. Critérios:
- Campo do formulário (ex.: só "quero orçamento")
- Origem/campanha (ex.: só campanhas pagas)
- Pontuação (score ≥ 70)
- Aprovação manual (pré-atendente aprova)

Leads não qualificados são salvos como "não qualificado" e não geram notificação ao vendedor.

**Conteúdo:**
- Card **Rodada da Vez** do cliente selecionado (quem recebe o próximo lead + "Passar a vez" + próximo). O `turnIndex` é mantido **por cliente**.
- Contador de **WhatsApp conectado (Evolution API)** do cliente, com nota de que as mensagens saem **do número do vendedor**, não do gestor, e de **distribuição transacional** (lock de concorrência).
- Tabela da equipe **daquele cliente**: nome, telefone, leads hoje, status do WhatsApp e ação **Conectar WhatsApp** (abre modal de QR / Evolution API).

#### Notificações (aba dentro do Workspace)
Para que serve: definir, **por cliente**, quais mensagens automáticas saem depois que o lead é processado. Fica em **Clientes → (abrir workspace) → aba Notificações**. As mensagens só disparam **depois** de tratar, validar, distribuir e definir o vendedor — sempre com os dados já normalizados (ordem: Distribuição → Banco → Integrações → Grupo → Vendedor → Cliente → Logs).
- **Painel de placeholders** (clicáveis, copiam ao clicar): dados do Lead (`{{lead.nome}}`, `{{lead.telefone}}`, `{{lead.email}}`, `{{lead.cidade}}`, `{{lead.origem}}`, `{{lead.formulario}}`, `{{lead.campanha}}`, `{{lead.adset}}`, `{{lead.anuncio}}`), **campos personalizados** do formulário do cliente (`{{lead.interesse}}`, `{{lead.produto}}`, `{{lead.valor}}`, `{{lead.profissao}}` — disponíveis automaticamente), vendedor (`{{vendedor.nome/telefone/email}}`), workspace (`{{workspace.nome}}`) e data (`{{data}}`, `{{hora}}`).
- **Mensagem para o grupo (Obrigatória, sem desligar):** registra toda entrada no grupo operacional. Template editável + prévia em balão WhatsApp + campo do grupo de destino.
- **Mensagem para o vendedor (Opcional, toggle):** vai ao WhatsApp do vendedor da vez. Template editável + prévia.
- **Mensagem para o cliente (Opcional, toggle):** reduz o tempo até o 1º contato. **Regra crítica destacada:** sai do **WhatsApp do vendedor responsável**, nunca de um número central — o cliente responde direto para quem vai atendê-lo. Template editável + atraso de envio + prévia "sai como {vendedor}".
- **Auditoria de mensagens:** tabela com hora, tipo (Grupo/Vendedor/Cliente), destinatário (com "via {vendedor}" no caso do cliente), template e status (Enviado / Reprocessado / Falhou com motivo).

#### Automação WhatsApp (`auto`)
Para que serve: sequência de mensagens que dispara sozinha quando o lead é distribuído — **por cliente** e **saindo do número do vendedor** (Evolution API), nunca do gestor.
- Chave mestra **Automação ativa** + seletor de Cliente (mesma lógica da Rodada).
- **Sequência editável**: Boas-vindas (imediato, ao distribuir) → Follow-up 1 (após 10 min sem resposta) → Follow-up 2 (após 1 dia), com variáveis `{nome}` `{vendedor}` `{empresa}` `{origem}` e botão para adicionar etapas.
- Card **"De qual número sai"**: o WhatsApp do **vendedor da vez** do cliente; se ele estiver desconectado, entra o próximo da Rodada. Prévia do chat no estilo WhatsApp mostrando as mensagens saindo do número do vendedor.

#### Logs & Automação (`logs`)
- **Camada de auto-correção (pull automático)** com liga/desliga: jobs que falham são reprocessados sozinhos (até 3 tentativas, backoff, via Inngest).
- Estatísticas (retries hoje, erros abertos).
- **Rotas de automação** (endpoints/webhooks) com status de saúde.
- **Stream de logs** em tempo real por nível (SUCCESS/INFO/WARN/ERROR) com botão **Reprocessar (pull)** nas linhas de erro.

### 4.4 Elementos globais
- **Login / Onboarding:** tela dividida (marca + formulário) que entra no app.
- **Topbar:** indicador "Motor ativo", alternância de tema, botão **Novo Lead**.
- **Modal Novo Lead:** entrada manual que cai na mesma fila de validação.
- **Detalhe do Lead (drawer):** dados + linha do tempo (webhook → validação Zod → distribuição).
- **Toasts** de confirmação para as ações.

---

## 5. Modelo interno unificado do lead

Toda origem é convertida para esta estrutura única — depois disso o motor não sabe mais de onde o lead veio:

```
id_interno              uuid
id_origem               string   // ex.: Lead ID da Meta (Graph API)
origem                  enum     // meta | google | api | landing | webhook
workspace · cliente · formulario
nome · telefone · email
campos_personalizados   json
payload_original        json
data · status · logs[]
```

---

## 6. Fluxo obrigatório de processamento

```
Origem → Webhook → Ingest → Normalização →
Identificação (Workspace / Cliente / Formulário) →
Aplicação das Regras → Validação (+ Idempotência) →
Rodada da Vez → Persistência (Banco) →
Integrações → Logs → Finalização
```

- **Idempotência:** antes de qualquer ação, checa se o `id_origem` já foi processado; se sim, nada é reexecutado.
- **Falha isolada:** só a etapa com erro é reprocessada, preservando as demais.

---

## 7. Estado atual (o que é real x simulado)

**Interações que já funcionam no protótipo:**
- Navegação entre todos os módulos; tema claro/escuro; responsivo/mobile.
- CRM: arrastar cards entre colunas, mover status pela lista, agrupamento, soma por coluna.
- Rodada da Vez: passar a vez (rotação).
- Fontes: wizard de conexão completo; abrir configuração por formulário.
- Regras: **gerar planilha CSV** (download real).
- Logs: liga/desliga do auto-retry.

**Simulado (sem backend):**
- Conexão real com Meta/Google (token, Graph API, listagem de páginas/formulários).
- Persistência em banco, filas (Inngest), idempotência real, locks de concorrência.
- Envio real de WhatsApp (Evolution API), sync com Kommo e Google Sheets.
- QR de WhatsApp e validação de token são representações visuais.

---

## 8. Próximos passos sugeridos (para o desenvolvimento real)

1. **Backend do Lead Engine** com o fluxo da seção 6 e o modelo da seção 5.
2. **Banco de dados** como fonte oficial (leads, workspaces, vendedores, filas, logs).
3. **Idempotência** por `id_origem` (constraint única) + verificação antes de processar.
4. **Distribuição transacional** (transação/lock) para a Rodada da Vez.
5. **Camada de adapters** para cada integração (Meta, Google, Kommo, Sheets, Evolution), com a lógica de negócio isolada dos SDKs.
6. **Fila/orquestração** (ex.: Inngest) com retry/backoff e **reprocesso por etapa**.
7. **Conexão real das fontes** (token Long-Lived da Meta, listagem via Graph API; equivalente no Google).
8. **Auditoria/logs** persistidos e pesquisáveis.
9. (Opcional) **Status de funil personalizados** por workspace, no estilo Kommo (LEAD, QUALIFICAÇÃO, NO-SHOW, DIAGNÓSTICO AGENDADO, NEGOCIAÇÃO, FOLLOWUP, DESQUALIFICADO, PERDIDO, NEGÓCIO FECHADO), com gerenciador para criar/reordenar.

---

## 9. Notas técnicas do protótipo

- Construído como **Design Component** (`.dc.html`): um único arquivo com template + classe de lógica.
- **Roteamento por estado** (uma tela ativa por vez via `screen`), sem framework de rotas.
- **Estilos inline** com variáveis CSS para tema; sem stylesheet externo de componentes.
- **Ícones:** estilo Lucide (SVG inline).
- Todo o conteúdo é **dado de exemplo**; nomes, telefones e valores são fictícios.

---

## 10. Integração Meta — referência técnica (Graph API)

> Baseado na documentação oficial (developers.facebook.com/docs/graph-api). Esta seção descreve **exatamente** o que o backend precisa fazer ao integrar um token/API da Meta e como lidar com 2FA. É a especificação de implementação para a Central de Integrações.

### 10.1 Tipos de token (qual usar)
- **User Access Token** — obtido via Facebook Login. Curta duração (~1–2 h) por padrão; deve ser trocado por **long-lived** (~60 dias).
- **Page Access Token** — token da **Página**; é o que lê os Lead Ads. Quando obtido a partir de um **user token long-lived**, o page token **não expira** (enquanto a permissão existir).
- **System User Token (Business Manager)** — token de **usuário de sistema** criado no Business Manager. **Não expira** e é o método recomendado para **contas administradas pela agência** (não passa por login interativo nem 2FA). Corresponde ao "Access Token permanente" do wizard.
- **App Access Token** — `{app-id}|{app-secret}`; usado só para validar tokens (debug) e chamadas server-to-server.

### 10.2 Dois métodos de autenticação (os do wizard)
**Método 1 — OAuth / Facebook Login** (contas de cliente):
1. Redirecionar para `https://www.facebook.com/v XX.0/dialog/oauth?client_id={app-id}&redirect_uri={uri}&state={csrf}&scope={escopos}`.
2. Meta retorna `?code=...` no `redirect_uri`.
3. Trocar o code por user token curto: `GET /v XX.0/oauth/access_token?client_id=...&client_secret=...&redirect_uri=...&code=...`.
4. Trocar curto → **long-lived**: `GET /v XX.0/oauth/access_token?grant_type=fb_exchange_token&client_id=...&client_secret=...&fb_exchange_token={short}`.
5. Obter page tokens: `GET /me/accounts` (retorna páginas + `access_token` de cada uma, já não-expirável).

**Método 2 — Token permanente (System User)** (contas da agência): gerar o token no Business Manager (System Users → Generate Token), atribuir os ativos (Páginas, contas de anúncio) e colar o token direto na Central. Não há fluxo interativo.

**Recomendação de uso (por perfil):**
- **Gestor / agência (uso principal hoje):** usar o **Método 2 (token permanente / System User)**. O gestor configura uma vez na Central; não expira e não dispara login/2FA a cada uso.
- **Cliente final (se receber acesso próprio):** usar o **Método 1 (OAuth, "Entrar com Facebook")**. Um clique, sem token nem ID — pensado para quem não é técnico. O cliente nunca manuseia credenciais.

### 10.3 2FA / autenticação de dois fatores
- O 2FA acontece **no login do usuário** durante o OAuth (Método 1) — é resolvido pela própria tela da Meta; o app **não** implementa 2FA, apenas recebe o `code` depois.
- Para **evitar 2FA em automação** (o caso da agência), usar **System User Token** (Método 2): não há login recorrente, portanto não há prompt de 2FA.
- Boa prática de segurança: habilitar **`appsecret_proof`** (HMAC-SHA256 do token com o app secret) nas chamadas server-side.

### 10.4 Validar o token (obrigatório após salvar)
- Endpoint: `GET /debug_token?input_token={TOKEN}&access_token={APP_TOKEN}`.
- Ler da resposta: `is_valid`, `app_id`, `expires_at`, `data_access_expires_at`, `scopes[]` e `granular_scopes[]`.
- **Mostrar o motivo exato do erro** (não "erro de conexão"). Códigos comuns:
  - `190` — token inválido/expirado (subcódigos: `463` expirado, `467` inválido, `460` senha alterada, `458` app não autorizado).
  - `102 / 10 / 200 / 294` — permissão/escopo ausente.
- Escopos necessários para Lead Ads: **`leads_retrieval`**, `pages_show_list`, `pages_read_engagement`, `pages_manage_metadata` (assinar webhook) e `business_management` (listar BMs). Em produção exigem **App Review / Advanced Access**.

### 10.5 Descobrir ativos automaticamente (sem digitar ID)
- Business Managers: `GET /me/businesses`.
- Páginas (+ page tokens): `GET /me/accounts`.
- Contas de anúncio: `GET /me/adaccounts`.
- Formulários de Lead Ads da página: `GET /{page-id}/leadgen_forms` (usar o **page token**).
- É isso que alimenta a árvore **Business ▸ Página ▸ Formulários** do wizard e o botão **Sincronizar** (reconsulta `leadgen_forms` e traz formulários novos).

### 10.6 Receber o lead (webhook → Form ID → Workspace)
1. Configurar **Webhooks** do app no campo **`leadgen`** (com verify token) e assinar a página: `POST /{page-id}/subscribed_apps?subscribed_fields=leadgen`.
2. No evento chega `leadgen_id`, `form_id`, `page_id`.
3. Buscar os dados: `GET /{leadgen_id}` (com o page token) → `field_data`.
4. **Roteamento:** achar o Workspace pelo **`form_id`** (índice único Form ID → Workspace), carregar a config e executar o Motor. Idempotência pela chave `leadgen_id`.

### 10.7 Segurança
- Token **criptografado em repouso**; **nunca** exibir completo na UI (sempre mascarar, ex.: `EAAB••••P9D`).
- Usar `appsecret_proof`, validar assinatura `X-Hub-Signature-256` dos webhooks, e renovar/rotacionar tokens antes de `data_access_expires_at`.
