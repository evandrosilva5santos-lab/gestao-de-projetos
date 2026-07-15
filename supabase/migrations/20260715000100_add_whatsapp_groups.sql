CREATE TABLE IF NOT EXISTS gestao_leads_whatsapp_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  group_name TEXT NOT NULL,
  group_jid TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT false,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, group_jid)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_groups_workspace ON gestao_leads_whatsapp_groups(workspace_id);
