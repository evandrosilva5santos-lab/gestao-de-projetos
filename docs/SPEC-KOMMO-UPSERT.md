# 🛠️ SPEC Executável: Kommo Upsert (Reconciliar em vez de Duplicar)

> Para a coordenadora despachar. Alvo: reescrever `sendLeadToKommo` em
> `lib/leads/integrations/kommo.ts` (arquivo NÃO tocado nesta frente).
> Objetivo: parar de duplicar contato/negócio e **enriquecer** o que a integração
> nativa Facebook→Kommo já criou. Nada de disparo de WhatsApp aqui.

## 1. Contexto (por que mudar)
A conta Kommo da Karol tem a **integração NATIVA Facebook Lead Ads ATIVA**. Ela cria o
negócio automaticamente com nome **`Facebook №{leadgenId}`**. Se a nossa automação também
**cria** contato+negócio, viram duplicatas (foi a origem dos "10–30 do mesmo contato" e do
merge de pessoas diferentes num só deal).

**Fato confirmado (read-only, 2026-07-14):** de 29 deals "Facebook №" checados, **29/29** têm
o número igual ao `leadId` da planilha (ex.: Maicon `l:1758004355654968` = deal
`Facebook №1758004355654968`). Ou seja, **o número do deal nativo É o `leadgenId`** que
recebemos no webhook. Casar por ele é confiável.

## 2. Regra de negócio (a base de tudo)
| Entidade | O que é | Dedup por | Pode repetir? |
|---|---|---|---|
| **Contato** | a pessoa | **telefone + e-mail** (confirma com contact id) | ❌ **nunca** |
| **Oportunidade (deal)** | um projeto/negócio | **`leadgenId`** (evento de entrada) | ✅ **sim** (nova entrada = novo negócio) |

- Um contato pode ter **vários** negócios ao longo do tempo (tráfego hoje, social em 6 meses).
- O proibido é **duplicar o contato** e **duplicar o negócio do mesmo evento** (`leadgenId`).

## 3. Fluxo novo do `sendLeadToKommo` (upsert)

### Passo A — Resolver o CONTATO (find-or-create, nunca duplica)
1. Buscar por **telefone** (tentar variações: só dígitos; com/sem DDI `55`; com/sem 9º dígito).
2. Se não achou, buscar por **e-mail**.
3. **Achou** → usa esse `contactId`. `PATCH /api/v4/contacts` só se algum dado divergir
   (nome/e-mail/telefone ausentes). **Nunca cria um segundo contato.**
4. **Não achou em nenhum** → `POST /api/v4/contacts` (cria 1x).

> ⚠️ Robustez é crítica aqui: a busca precisa encontrar o contato que a **nativa** criou.
> Se a busca falhar por formato de telefone, nasce um contato duplicado. Buscar por
> variações + e-mail antes de criar.

### Passo B — Resolver a OPORTUNIDADE (por evento `leadgenId`, **agnóstico à fonte**)
> ⚠️ Nem todo cliente tem a integração nativa Facebook→Kommo. Em alguns, a nossa
> automação é a **única** fonte. A busca do deal do evento **não pode depender** do nome
> `Facebook №...` (que só existe quando a nativa está ligada). Ver §10.

1. Procurar o deal deste evento pelo `leadgenId`, nesta ordem:
   1. **Campo custom `leadgenId`** do deal (buscável) — pega os deals que **nós** criamos.
   2. **Nome `Facebook №{leadgenId}`** — pega os deals que a **nativa** criou
      (`GET /api/v4/leads?query=Facebook №{leadgenId}`, validar `/Facebook\s*№\s*{leadgenId}\b/`).
   3. Fallback: entre os deals já vinculados ao contato, algum cujo nome/campo tenha o `leadgenId`.
2. **Achou o deal** → **`PATCH /api/v4/leads/{id}`** (enriquecer, ver Passo C).
   Garantir que o **contato resolvido no Passo A** esteja vinculado e seja o `is_main`.
   **Não cria outro deal.**
3. **Não achou** → **`POST /api/v4/leads`** um negócio novo, vinculado ao `contactId`,
   **gravando o `leadgenId` no campo custom** (para reprocessamentos futuros o acharem).
   Sem `leadgenId` no lead? Ver §10 (política sem evento).

### Passo C — Enriquecer o negócio (o "nosso fluxo correto")
Ao PATCH/POST, aplicar o padrão da casa:
- **Nome**: `Lead: {nome}` (substitui o cru `Facebook №...`).
- **Pipeline/estágio**: `pipelineId` / `statusId` corretos do cliente.
- **Campos custom**: UTM (content/medium/campaign/source), interesse, orçamento, faixa salarial, quando deseja iniciar.
- **Vendedor da vez**: `responsible_user_id` (round-robin do nosso motor).
- **Tags**: META ADS / GOOGLE ADS conforme origem + tag do cliente.
- **Rastreabilidade**: nota com `Facebook Lead ID: {leadgenId}` (idempotência/auditoria).

## 4. Matriz de decisão

| Contato existe? | Deal do `leadgenId` existe? | Ação |
|---|---|---|
| Não | — | Cria contato → cria deal (enriquecido) |
| Sim | Não | Usa contato → cria deal novo (nova oportunidade, enriquecido) |
| Sim | Sim (nativo) | Usa contato → **PATCH** deal (enriquece + garante `is_main` correto) |
| Sim (é secundário de outro deal) | — | Cria/garante **deal próprio** do contato (corrige o caso "Elizane") |

## 5. Endpoints Kommo (v4)
- `GET /api/v4/contacts?query={telefone|email}&with=leads` — achar contato + deals.
- `POST /api/v4/contacts` · `PATCH /api/v4/contacts` (array com `id`).
- `GET /api/v4/leads?query=Facebook №{leadgenId}` — achar deal do evento.
- `GET /api/v4/leads/{id}?with=contacts` — conferir `is_main`.
- `POST /api/v4/leads` · `PATCH /api/v4/leads/{id}`.

## 6. Idempotência & robustez
- **Chave do contato**: telefone normalizado (variações) + e-mail. Um só contato por pessoa.
- **Chave do deal**: `leadgenId`. Nunca 2 deals para o mesmo `leadgenId`.
- **Ordem importa**: a nativa pode criar o deal antes do nosso webhook — por isso *procurar
  primeiro, agir depois*.
- **Logar a resposta**: contato novo vs existente; deal criado vs atualizado; `is_main` final.
  (Hoje o código confia em 2xx cego — foi assim que passou "só contato" despercebido.)
- **Rate limit** Kommo ~7 req/s: espaçar chamadas.

## 7. O que NÃO fazer
- ❌ Não criar 2º contato da mesma pessoa.
- ❌ Não criar 2º deal do mesmo `leadgenId`.
- ❌ Não disparar WhatsApp a partir desse caminho (segue no motor, sem mudança).
- ❌ Não confiar na coluna "FOI PRO KOMMO?" da planilha (é otimista/mentirosa).

## 8. Limpeza do passivo (fase separada, opcional)
Os casos já bagunçados (ver `DIAGNÓSTICO-RECONCILIAÇÃO-5-CASOS.md`): 4 "só contato" (Luciano,
Maicon, Elizete, Elizane) + 1 ausente (Fátima). Corrigir via ação assistida (com confirmação
humana) na frente **Reconciliation** — desvincular secundário / criar deal próprio / reenviar
Fátima. Nunca automático, nunca com disparo.

## 9. Critérios de aceite
1. Reprocessar um lead cujo `leadgenId` já tem deal nativo **não cria** novo deal nem novo contato — **atualiza**.
2. Reprocessar a mesma pessoa 3x **mantém 1 contato**.
3. Mesma pessoa com 2 `leadgenId` diferentes → **2 negócios**, **1 contato**.
4. Contato secundário sem deal próprio (Elizane) → passa a ter **deal próprio** com `is_main`.
5. Todo negócio criado/atualizado tem nome padrão, campos, estágio, vendedor e tags corretos.
6. **Cliente SEM nativa**: lead novo → cria contato + deal (com `leadgenId` no campo custom); reprocessar o mesmo `leadgenId` **não** duplica o deal.
7. **Cliente COM nativa**: acha o deal `Facebook №{leadgenId}` e enriquece (não duplica).

## 10. Agnóstico à fonte (cliente COM vs SEM integração nativa) — critério de validação
A automação **detecta a situação e se adapta**, sem assumir a nativa:

| Situação | Deal do evento | Comportamento |
|---|---|---|
| Cliente **com** nativa Facebook | já existe como `Facebook №{leadgenId}` | acha por nome/campo → **PATCH** (enriquece) |
| Cliente **sem** nativa | não existe | **cria** contato + deal, gravando `leadgenId` no **campo custom** |
| Lead **sem `leadgenId`** (entrada manual, outra origem) | não há chave de evento | cria deal novo, mas com **trava temporal** (não criar 2 deals idênticos p/ o mesmo contato numa janela curta, ex.: 5 min) para evitar duplicata de reprocesso |

**Como saber se o cliente tem a nativa?** Não precisa de flag obrigatória: a busca do Passo B
(campo custom **e** nome `Facebook №`) cobre os dois. Opcionalmente, um flag por cliente
(`config.hasNativeFacebook`) pode pular a busca por nome quando irrelevante (otimização, não requisito).

**Invariantes que valem SEMPRE (com ou sem nativa):**
- Contato dedup por telefone+e-mail → **1 pessoa = 1 contato**.
- Deal dedup por `leadgenId` → **1 evento = 1 negócio** (mas 1 pessoa pode ter N negócios de N eventos).
- Guardar `leadgenId` no **campo custom do deal** é o que torna a reconciliação confiável
  independentemente de quem criou o negócio.
