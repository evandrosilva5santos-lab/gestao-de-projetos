-- Create lead audits table for tracking Meta lead processing status
CREATE TABLE IF NOT EXISTS gestao_leads_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES gestao_leads_meta_connections(id) ON DELETE CASCADE,
    form_id TEXT NOT NULL,
    form_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, COMPLETED, FAILED
    total_leads INT NOT NULL DEFAULT 0,
    processed_leads INT NOT NULL DEFAULT 0,
    error_message TEXT,
    results JSONB, -- Stores the list of missing leads, or detailed discrepancy report
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gestao_leads_audits ENABLE ROW LEVEL SECURITY;

-- Workspace admins can view and manage their audits
CREATE POLICY "Admins podem gerenciar auditorias do workspace" 
ON gestao_leads_audits FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM core_workspace_members 
    WHERE workspace_id = gestao_leads_audits.workspace_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM core_workspace_members 
    WHERE workspace_id = gestao_leads_audits.workspace_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);
