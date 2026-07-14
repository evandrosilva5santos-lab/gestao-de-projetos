-- Permite registrar eventos que acontecem ANTES (ou em vez) de um lead existir.
--
-- Caso concreto: um lead chega de um formulário que não está monitorado. Ele é
-- descartado de propósito — logo não vira linha em gestao_leads — mas precisa
-- aparecer no log, senão um formulário desmarcado por engano vira lead sumido
-- sem rastro.
--
-- Duas mudanças:
--   1. lead_id passa a ser nullable (evento sem lead).
--   2. workspace_id entra direto na tabela — antes o workspace só era alcançável
--      via join com gestao_leads, o que é impossível quando não há lead. Também
--      deixa a consulta do painel mais direta (filtro por coluna, não por join).

ALTER TABLE gestao_leads_audit_logs
    ALTER COLUMN lead_id DROP NOT NULL;

ALTER TABLE gestao_leads_audit_logs
    ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES core_workspaces(id) ON DELETE CASCADE;

-- Backfill dos logs existentes, que só conheciam o workspace pelo lead.
UPDATE gestao_leads_audit_logs l
SET workspace_id = ld.workspace_id
FROM gestao_leads ld
WHERE l.lead_id = ld.id
  AND l.workspace_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_gestao_leads_audit_logs_workspace
    ON gestao_leads_audit_logs (workspace_id, created_at DESC);
