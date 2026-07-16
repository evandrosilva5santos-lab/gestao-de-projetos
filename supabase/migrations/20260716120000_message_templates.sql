-- Templates de mensagem por cliente (orquestrador de fila — Fase B).
-- Guardado no mesmo lugar das outras regras do workspace (jsonb), no padrão do
-- campo `qualification`. Aditivo e não-destrutivo: coluna nova com default nulo;
-- quando ausente, o app cai nos DEFAULT_TEMPLATES (lib/leads/templates.ts).
--
-- Formato:
-- {
--   "client": { "enabled": bool, "text": "...", "randomBlocks": { "saudacao": ["...","..."] } },
--   "group":  { "enabled": bool, "text": "...", "randomBlocks": {} }
-- }
ALTER TABLE gestao_leads_workspace_rules
    ADD COLUMN IF NOT EXISTS message_templates JSONB;
