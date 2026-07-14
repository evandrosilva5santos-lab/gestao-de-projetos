-- Nomenclatura segue 00 - Regras/DATABASE-NAMING.md
--
-- Tabela para persistir credenciais e configurações de destinos de leads (CRM, Planilhas, etc)
-- de cada Workspace (Cliente).
CREATE TABLE IF NOT EXISTS gestao_leads_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'kommo' | 'google_sheets'
    config JSONB NOT NULL, -- Credenciais cifradas / parâmetros de mapeamento
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, type)
);

-- Configurando RLS para a tabela de destinos
ALTER TABLE gestao_leads_destinations ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS simples para visualização/edição administrativa
CREATE POLICY "Permitir leitura para membros do workspace"
    ON gestao_leads_destinations
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM core_workspace_users
            WHERE user_id = auth.uid()
        )
    );
