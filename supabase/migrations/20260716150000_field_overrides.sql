-- Mapeamento manual de campo → conceito, por cliente (revisão de mapeamento).
-- Quando um campo do formulário não casa automaticamente (matchConcept), o
-- usuário aponta manualmente pra qual conceito ele corresponde. Guardado junto
-- das outras regras do workspace, no padrão jsonb.
--
-- Formato: { "<rótulo do campo>": "<chave do conceito>", ... }
-- Ex.: { "quanto de crédito você quer?": "budget" }
ALTER TABLE gestao_leads_workspace_rules
    ADD COLUMN IF NOT EXISTS field_overrides JSONB;
