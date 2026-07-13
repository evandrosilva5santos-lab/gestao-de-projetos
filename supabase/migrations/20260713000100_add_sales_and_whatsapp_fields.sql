-- Nomenclatura segue 00 - Regras/DATABASE-NAMING.md
--
-- Vendedores do rodízio NÃO têm login na plataforma (mesmo modelo da planilha
-- "Fila da Vez" que este módulo substitui) — por isso vivem em tabela própria
-- do módulo Leads, e NÃO em core_workspace_users (que é login/acesso, conceito
-- de plataforma compartilhado entre todos os apps).

-- App Gestão, módulo Leads: vendedores do rodízio (fila da vez)
CREATE TABLE gestao_leads_sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES core_workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crm_user_id TEXT, -- ID do usuário no Kommo (atribuição direta do lead)
    phone TEXT,
    email TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_gestao_leads_sellers_round_robin
    ON gestao_leads_sellers (workspace_id, is_active, last_assigned_at);

ALTER TABLE gestao_leads_sellers ENABLE ROW LEVEL SECURITY;

-- App Gestão, módulo Leads: configuração de notificação (WhatsApp/Evolution API)
-- Vive fora de core_workspaces para não vazar config específica de um módulo
-- (Leads) para dentro da tabela de tenant, que é compartilhada entre todos os apps.
CREATE TABLE gestao_leads_notification_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL UNIQUE REFERENCES core_workspaces(id) ON DELETE CASCADE,
    evolution_url TEXT,
    evolution_instance TEXT,
    evolution_token TEXT,
    group_jid TEXT,
    notify_seller BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gestao_leads_notification_configs ENABLE ROW LEVEL SECURITY;

-- gestao_leads: aponta para o vendedor da vez na tabela correta do módulo
ALTER TABLE gestao_leads
    DROP COLUMN IF EXISTS assigned_to;

ALTER TABLE gestao_leads
    ADD COLUMN seller_id UUID REFERENCES gestao_leads_sellers(id) ON DELETE SET NULL;

CREATE INDEX idx_gestao_leads_workspace_status
    ON gestao_leads (workspace_id, status, created_at);

-- Rodízio ATÔMICO: uma única operação de UPDATE...RETURNING com FOR UPDATE SKIP LOCKED.
-- Impossível dois leads simultâneos pegarem o mesmo vendedor (elimina o bug
-- de condição de corrida que existia no fluxo N8N original — ver PLANO-EXECUCAO-MODULO-LEADS.md).
-- RETURNS SETOF (não uma linha escalar): quando não há vendedor disponível,
-- o UPDATE...RETURNING não encontra linhas e a função deve retornar um
-- conjunto VAZIO, não lançar erro. Isso é o caso legítimo "waiting_seller".
CREATE OR REPLACE FUNCTION assign_next_seller(p_workspace_id UUID)
RETURNS SETOF gestao_leads_sellers
LANGUAGE sql
AS $$
    UPDATE gestao_leads_sellers s
    SET last_assigned_at = NOW()
    WHERE s.id = (
        SELECT id FROM gestao_leads_sellers
        WHERE workspace_id = p_workspace_id AND is_active = true
        ORDER BY last_assigned_at ASC NULLS FIRST
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING s.*;
$$;
