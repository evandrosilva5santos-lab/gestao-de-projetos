-- Tabela de conexões com a Meta (Facebook Leads Ads) por Workspace
CREATE TABLE IF NOT EXISTS gestao_leads_meta_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    page_id TEXT NOT NULL, -- ID da página do Facebook
    page_name TEXT, -- Nome descritivo da página
    access_token TEXT NOT NULL, -- Token de Acesso da Página (Page Access Token)
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, page_id)
);

-- Habilitando RLS para a tabela de conexões Meta
ALTER TABLE gestao_leads_meta_connections ENABLE ROW LEVEL SECURITY;
