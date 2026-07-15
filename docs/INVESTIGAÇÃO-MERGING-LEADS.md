# 🔎 Investigação: Por quê Elizane/Elizete Mesclam no Deal 12554648?

> Análise **read-only** (nenhum código alterado, nada escrito no Kommo/planilha).
> Fonte: API do Kommo (contatos e deals) + aba "Banco de Dados" da planilha da Karol. Data: 2026-07-14.

## Dados Coletados (evidência real)

| Pessoa | Contato | Telefone | Contato criado | Deal | Deal criado | `is_main`? |
|---|---|---|---|---|---|---|
| Enelize Santiago | #27591000 | 555597270882 | 2026-07-13 **14:30:57** | 12554648 | 2026-07-13 14:31:00 | ✅ SIM |
| Elizete Escobar | #27599794 | +5554984441674 | 2026-07-13 **15:00:56** | 12554648 | 2026-07-13 14:31:00 | ⚠️ NÃO |
| Elizane Farias | #27618102 | +554797914089 | 2026-07-13 **16:00:56** | 12554648 | 2026-07-13 14:31:00 | ⚠️ NÃO |

Deal 12554648: nome "Enelize Santiago Dionathan", pipeline 13924251, status 108370495, **3 contatos** vinculados (`#27591000(main), #27599794, #27618102`).

Caso análogo (Maicon): deal **9963832** nome **"Facebook №1758004355654968"**, 3 contatos (`#23660336, #23660360, #23660358(main)`) — Maicon (#23660336) não é main.

## Achados

### 1. Mesmo Telefone? — **REFUTADO** ✅
- Enelize: `...97270882`
- Elizete: `...84441674`
- Elizane: `...97914089`

**Telefones totalmente diferentes.** A deduplicação por telefone do nosso `sendLeadToKommo`
(busca pelos últimos 8 dígitos) **não seria acionada** — e agiu corretamente ao não juntar.
Portanto **o merge NÃO vem da nossa lógica de deduplicação.**

### 2. Ordem de Criação → explica o `is_main` — **CONFIRMADO** ✅
- Enelize (contato criado **14:30:57**, 3 s antes do deal) → virou `is_main`.
- Elizete (**15:00:56**, ~30 min depois do deal) → secundário.
- Elizane (**16:00:56**, ~1h30 depois do deal) → secundário.

**Padrão:** o contato criado **junto com o deal** é o principal; os anexados **depois** entram
como secundários. Nosso critério de "negócio próprio = `is_main`" está, portanto, **correto** —
ele reflete fielmente quem tem o deal e quem foi só pendurado.

### 3. Comportamento do Kommo / fonte dupla — **HIPÓTESE MAIS FORTE** ⭐
Fato: contatos de **pessoas diferentes**, criados em **horários espaçados** (30 min, 1h30),
acabam **anexados ao mesmo deal já existente**. Isso não é retry de webhook (retry seria em
segundos) nem dedup por telefone (telefones diferem).

Dois indícios de **agrupamento dentro do próprio Kommo**:
- Existe deal nomeado **"Facebook №1758004355654968"** (caso Maicon) — padrão de nome da
  **integração NATIVA Facebook Lead Ads do Kommo**. Se essa integração estiver **ativa em
  paralelo** à nossa API, há **duas fontes** criando leads/contatos, e a **regra de detecção
  de duplicados** do Kommo pode estar agrupando contatos sob um deal existente.
- Os contatos secundários são anexados a um deal **em estágio inicial aberto** (status
  108370495), comportamento típico de regra "não duplicar negócio aberto do mesmo cliente".

### 4. Webhook chamado múltiplas vezes? — **IMPROVÁVEL para o merge**
O espaçamento de 30 min–1h30 entre criações descarta retry/idempotência como causa do merge
(seriam quase simultâneos). Idempotência ainda vale investigar para **contatos órfãos** como o
**Luciano** (contato sem telefone e sem deal — envio parcial).

## Conclusão

| Hipótese | Veredito | Evidência |
|---|---|---|
| H1 — Dedup por telefone falhou | ❌ Refutada | Telefones diferentes; nossa dedup não agiria |
| H2 — `is_main` = primeiro criado | ✅ Confirmada | Timestamps: contato do deal criado junto = main |
| H3 — Webhook múltiplo (retry) | ❌ Improvável p/ merge | Criações espaçadas 30 min–1h30 |
| **H4 — Agrupamento interno do Kommo (regra de duplicados + Facebook nativo)** | ⭐ **Mais provável** | Deal "Facebook №..."; anexação pós-criação a deal aberto |

**Resumo:** o merge não é bug do nosso código de deduplicação. A causa provável é o
**Kommo agrupando contatos sob um deal existente** — muito provavelmente porque a **integração
nativa Facebook Lead Ads** e/ou a **detecção de duplicados** do Kommo estão ativas junto com a
nossa API. Confirmar isso é o próximo passo (é configuração da conta Kommo da Karol, não código).

## Recomendações para `sendLeadToKommo` (quando a coordenadora abrir essa frente)

- [ ] **Logar a resposta do Kommo**: ao criar contato, registrar `id` retornado e se foi
      **novo vs existente**; ao criar deal, registrar `deal_id` e se o contato ficou `is_main`.
- [ ] **Validação pós-criação**: se após o POST o contato **não** for `is_main` do deal
      esperado, marcar o lead como "negócio não confirmado" (não confiar em 2xx cego).
- [ ] **Evitar fonte dupla**: verificar na conta Kommo da Karol se a **integração nativa
      Facebook Lead Ads** está ativa em paralelo — se sim, escolher **uma** fonte de verdade.
- [ ] **Config de duplicados**: revisar a regra de "detecção de duplicados" do Kommo, que pode
      estar agrupando contatos distintos sob um mesmo negócio.

## Como reproduzir esta investigação (read-only)
Consultas usadas (apenas GET, Bearer token do destino `kommo` da Karol):
- `GET /api/v4/contacts/{id}?with=leads` — telefone, `created_at`, deals do contato.
- `GET /api/v4/leads/{deal_id}?with=contacts` — nome/estágio do deal e `is_main` de cada contato.
- `GET /api/v4/contacts?query={telefone|email}` — confirmar ausência (caso Fátima → 0 resultados).
