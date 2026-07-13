-- Nomenclatura segue 00 - Regras/DATABASE-NAMING.md (projeto Supabase compartilhado entre todos os apps)

-- Tabela CORE: Workspaces (Clientes/Agências) — conceito de plataforma, sem prefixo de app
CREATE TABLE core_workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela CORE: Usuários por Workspace
CREATE TABLE core_workspace_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- Referência ao auth.users do Supabase
    role TEXT NOT NULL DEFAULT 'member', -- admin, member, sales
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- App Gestão, módulo Leads: Regras de Distribuição de Leads
CREATE TABLE gestao_leads_distribution_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL, -- ex: 'round_robin', 'weight', 'region'
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Gestão, módulo Leads: tabela central do módulo (sem repetir "leads")
CREATE TABLE gestao_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    name TEXT,
    email TEXT,
    phone TEXT,
    source TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new', -- new, processing, distributed, error
    assigned_to UUID REFERENCES core_workspace_users(id) ON DELETE SET NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- App Gestão, módulo Leads: Audit Logs
CREATE TABLE gestao_leads_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES gestao_leads(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- received, treated, distributed, notified, error
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Configurando RLS (Row Level Security)
ALTER TABLE core_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_leads_distribution_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_leads_audit_logs ENABLE ROW LEVEL SECURITY;
