# 🔍 Diagnóstico: 5 Leads Fora do Padrão (Frente Reconciliação)

> Cliente: **Karol Schutz** · Data do scan: **2026-07-14** · Fonte: aba "Banco de Dados" (59 leads) cruzada com a API do Kommo (read-only).
> Método: casamento por telefone normalizado (últimos 8 dígitos) + verificação de **negócio próprio** = ser contato **principal (`is_main`)** de algum deal.

## Resumo Executivo
De **59 leads** validados, **54 têm negócio próprio** ✅.
**5 leads** apresentam anomalias que a coluna "FOI PRO KOMMO?" da planilha **não capturava** (4 deles estavam marcados `ok` mesmo sem negócio próprio — a coluna é otimista/mentirosa).

| Situação | Qtd |
|---|---|
| 🟢 Negócio próprio no Kommo | 54 |
| 🟡 Só contato, sem negócio próprio | 4 |
| 🔴 Nem contato no Kommo | 1 |

## Os 4 Casos: "Só Contato, Sem Negócio"

| Lead | Telefone | Status Kommo | Motivo (evidência) | Ação Recomendada |
|------|----------|-------------|--------|------------------|
| Luciano Rodrigues | 5551984474840 | Contato #23670984, **sem nenhum deal** e **sem telefone salvo** | Deal nunca criado (envio parcial) | Revisar log `sendLeadToKommo`; recriar negócio |
| Maicon Ávila | +5554996190461 | Contato #23660336 vinculado ao deal **9963832 "Facebook №1758004355654968"** como secundário | Mesclado em deal de outra origem (Facebook nativo) | Desvincular e converter em negócio próprio |
| Elizete Escobar | +5554984441674 | Contato #27599794 mesclado no deal **12554648** (main = Enelize) | Anexado a deal alheio 30 min após o deal existir | Desvincular ou converter |
| Elizane Farias | +554797914089 | Contato #27618102 mesclado no deal **12554648** (main = Enelize) | Anexado a deal alheio 1h30 após o deal existir | Desvincular ou converter |

## O Caso Crítico: "Nem Contato no Kommo"

| Lead | Telefone | Status Kommo | Motivo | Ação Recomendada |
|------|----------|-------------|--------|------------------|
| Fátima Regina Fernandes | +5548999198480 | **Não existe** (0 contatos por telefone e por e-mail) | Envio ao Kommo nunca chegou | Reenviar. Obs.: já estava `vazio` na coluna "FOI PRO KOMMO?" da planilha (coerente) |

## Descoberta-Chave: O Padrão de Mesclagem

**Elizane → Elizete → Enelize** estão TODAS vinculadas ao **mesmo negócio (deal 12554648, "Enelize Santiago Dionathan")**, apesar de serem **pessoas diferentes com telefones diferentes**:

| Contato | Telefone | Contato criado em | É `is_main`? |
|---|---|---|---|
| Enelize (#27591000) | 555597270882 | 2026-07-13 14:30:57 | ✅ SIM |
| Elizete (#27599794) | +5554984441674 | 2026-07-13 15:00:56 | ⚠️ NÃO |
| Elizane (#27618102) | +554797914089 | 2026-07-13 16:00:56 | ⚠️ NÃO |

- Deal 12554648 criado em **14:31:00** (3 s depois do contato da Enelize).
- Elizete e Elizane foram **anexadas ao deal já existente** (30 min e 1h30 depois).
- **Só a Enelize** (contato criado junto com o deal) é `is_main` → tem negócio próprio.

O mesmo padrão aparece no **Maicon** (deal 9963832, nome "Facebook №...", 3 contatos, main é um terceiro).

**O que está acontecendo:** pessoas distintas estão caindo como contatos secundários de um único deal.
Como os **telefones são diferentes**, **NÃO é a nossa deduplicação por telefone**. Aponta para agrupamento **dentro do Kommo** (regra de duplicados e/ou a integração nativa Facebook Lead Ads rodando em paralelo à nossa API). Detalhes e evidências em [`INVESTIGAÇÃO-MERGING-LEADS.md`](./INVESTIGAÇÃO-MERGING-LEADS.md).

## Recomendações de Ação

1. **Curto prazo** (antes do MegaInvest): confirmar a causa raiz do merge (ver investigação) — em especial se a **integração nativa Facebook↔Kommo** está ativa junto com a nossa API.
2. **Médio prazo**: feature de "auto-correção" na frente Reconciliação — desvincular contato secundário e criar/converter negócio próprio (com confirmação humana; nunca automático e nunca disparando WhatsApp).
3. **Longo prazo**: revisar `sendLeadToKommo` para **logar a resposta** (contato novo vs existente; deal criado; `is_main`) e falhar de forma visível quando o deal não nasce próprio.

## Resumo em JSON (para consumo por API futura)

```json
{
  "report_date": "2026-07-14",
  "client": "Karol Schutz",
  "workspace_id": "486885a7-6b6e-4863-9141-47722331f466",
  "total_leads": 59,
  "healthy": 54,
  "anomalies": [
    { "name": "Luciano Rodrigues", "phone": "5551984474840", "type": "only-contact", "kommo_contact_id": 23670984, "deal_id": null, "recommendation": "check-logs" },
    { "name": "Maicon Ávila", "phone": "+5554996190461", "type": "merged", "kommo_contact_id": 23660336, "deal_id": 9963832, "recommendation": "delink" },
    { "name": "Elizete Escobar", "phone": "+5554984441674", "type": "merged", "kommo_contact_id": 27599794, "deal_id": 12554648, "recommendation": "delink" },
    { "name": "Elizane Farias", "phone": "+554797914089", "type": "merged", "kommo_contact_id": 27618102, "deal_id": 12554648, "recommendation": "delink" },
    { "name": "Fátima Regina Fernandes", "phone": "+5548999198480", "type": "missing", "kommo_contact_id": null, "deal_id": null, "recommendation": "resend" }
  ]
}
```
