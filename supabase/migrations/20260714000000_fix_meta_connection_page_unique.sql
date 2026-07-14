-- Uma página do Facebook (page_id) pertence a exatamente 1 cliente por vez.
-- O UNIQUE(workspace_id, page_id) original permitia a MESMA página ser
-- cadastrada em 2 workspaces ao mesmo tempo, o que deixa o roteamento do
-- webhook (app/api/webhooks/leads/route.ts busca só por page_id + is_active)
-- ambíguo: com 2 conexões ativas para a mesma página, o .maybeSingle() do
-- Supabase escolhe uma arbitrariamente.
-- Idempotente (este script roda de novo a cada `apply-migrations.ts`).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'gestao_leads_meta_connections_page_id_key'
    ) THEN
        ALTER TABLE gestao_leads_meta_connections
            DROP CONSTRAINT IF EXISTS gestao_leads_meta_connections_workspace_id_page_id_key;

        ALTER TABLE gestao_leads_meta_connections
            ADD CONSTRAINT gestao_leads_meta_connections_page_id_key UNIQUE (page_id);
    END IF;
END $$;
