-- Fontes de Entrada (ver docs/PRD-FONTES-DE-ENTRADA.md).
-- Nomenclatura segue 00 - Regras/DATABASE-NAMING.md.
--
-- Resolve dois buracos do fluxo atual de "Nova integração":
--
-- 1. O token do Business Manager não tinha onde ser guardado — só vivia na
--    memória do modal para chamar me/accounts. Cada cliente novo exigia colar o
--    token e rebuscar todas as páginas. Agora a conexão (token) é um ativo de
--    NÍVEL AGÊNCIA, salvo uma vez e reutilizado por N workspaces; as páginas
--    baixadas ficam em cache.
--
-- 2. Os formulários eram listados na UI mas nunca persistidos, e o webhook
--    roteava só por page_id — na prática TODO formulário da página entrava.
--    `is_monitored` passa a ser o filtro real de quais formulários valem.
--
-- Aditiva: nada do que está em produção (gestao_leads_meta_connections e o
-- roteamento page_id -> workspace do webhook) muda de comportamento.

-- Conexão nível-agência: um token do Business Manager, reutilizável.
-- Sem workspace_id de propósito — um mesmo token enxerga páginas de vários
-- clientes. O vínculo com o cliente acontece na conexão da página.
CREATE TABLE IF NOT EXISTS gestao_leads_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type TEXT NOT NULL DEFAULT 'meta', -- 'meta' | 'google'
    name TEXT NOT NULL,                          -- nome descritivo dado pelo admin
    credentials JSONB NOT NULL,                  -- { token: "..." } — nunca exposto ao client
    status TEXT NOT NULL DEFAULT 'active',       -- 'active' | 'invalid' | 'expired'
    last_error TEXT,
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cache das páginas descobertas por um token. Evita refazer o fetch da Graph
-- API toda vez que o modal abre.
CREATE TABLE IF NOT EXISTS gestao_leads_source_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES gestao_leads_sources(id) ON DELETE CASCADE,
    external_page_id TEXT NOT NULL,
    name TEXT NOT NULL,
    page_access_token TEXT NOT NULL, -- token da página, derivado do token da source
    is_monitored BOOLEAN NOT NULL DEFAULT false, -- true = já vinculada a um cliente
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, external_page_id)
);

-- Formulários descobertos numa página. `is_monitored` é o filtro que o webhook
-- consulta: formulário não marcado não vira lead.
CREATE TABLE IF NOT EXISTS gestao_leads_source_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_page_id UUID NOT NULL REFERENCES gestao_leads_source_pages(id) ON DELETE CASCADE,
    external_form_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT, -- ACTIVE | ARCHIVED (como vem da Graph API)
    is_monitored BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_page_id, external_form_id)
);

-- Liga a conexão da página (que o webhook já usa) à source que a originou.
ALTER TABLE gestao_leads_meta_connections
    ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES gestao_leads_sources(id) ON DELETE SET NULL;

-- O webhook resolve o formulário do lead por external_form_id + page_id.
CREATE INDEX IF NOT EXISTS idx_gestao_leads_source_forms_external
    ON gestao_leads_source_forms (external_form_id);
CREATE INDEX IF NOT EXISTS idx_gestao_leads_source_pages_external
    ON gestao_leads_source_pages (external_page_id);
CREATE INDEX IF NOT EXISTS idx_gestao_leads_source_pages_source
    ON gestao_leads_source_pages (source_id);
CREATE INDEX IF NOT EXISTS idx_gestao_leads_source_forms_page
    ON gestao_leads_source_forms (source_page_id);

-- Estas tabelas são de nível agência (não têm workspace_id), então não seguem o
-- padrão de RLS por workspace das demais. Acesso só pelo service role
-- (Server Actions / webhook). Nenhuma policy = nenhum acesso via anon key.
ALTER TABLE gestao_leads_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_leads_source_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gestao_leads_source_forms ENABLE ROW LEVEL SECURITY;
