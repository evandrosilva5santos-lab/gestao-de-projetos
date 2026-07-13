-- Nomenclatura segue 00 - Regras/DATABASE-NAMING.md
--
-- Tabela de associação N:N entre Vendedores e Conexões Meta (Páginas do Facebook de cada Cliente)
-- Isso permite mapear exatamente quais vendedores atendem quais clientes.
CREATE TABLE IF NOT EXISTS gestao_leads_seller_connections (
    seller_id UUID NOT NULL REFERENCES gestao_leads_sellers(id) ON DELETE CASCADE,
    connection_id UUID NOT NULL REFERENCES gestao_leads_meta_connections(id) ON DELETE CASCADE,
    PRIMARY KEY (seller_id, connection_id)
);

-- Configurando RLS para a tabela de associação
ALTER TABLE gestao_leads_seller_connections ENABLE ROW LEVEL SECURITY;

-- Rodízio ATÔMICO por Conexão/Cliente:
-- Filtra os vendedores associados especificamente ao cliente/página que gerou o lead.
-- Impossível dois leads simultâneos pegarem o mesmo vendedor, e isola completamente a fila.
CREATE OR REPLACE FUNCTION assign_next_seller_for_connection(p_connection_id UUID)
RETURNS SETOF gestao_leads_sellers
LANGUAGE sql
AS $$
    UPDATE gestao_leads_sellers s
    SET last_assigned_at = NOW()
    WHERE s.id = (
        SELECT s2.id FROM gestao_leads_sellers s2
        JOIN gestao_leads_seller_connections sc ON s2.id = sc.seller_id
        WHERE sc.connection_id = p_connection_id AND s2.is_active = true
        ORDER BY s2.last_assigned_at ASC NULLS FIRST
        FOR UPDATE OF s2 SKIP LOCKED
        LIMIT 1
    )
    RETURNING s.*;
$$;
