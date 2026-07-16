-- Disponibilidade do vendedor + Qualificação de leads (ver DOCUMENTACAO.md,
-- seção "Vendedores & Rodada" — "Regra Principal: Disponibilidade" e
-- "Qualificação de leads"). Hoje assign_next_seller só filtra is_active=true;
-- isso adiciona pausa manual, férias, dia da semana e horário de atendimento,
-- e um filtro de qualificação antes da distribuição.

-- 1. Disponibilidade por vendedor. JSONB pra não precisar de N colunas/migrations
--    a cada regra nova. Formato: { paused, vacation:{from,to}, weekdays:[0..6],
--    hours:{start,end} }. weekdays vazio/ausente = atende todo dia. hours
--    ausente = atende 24h. Nada preenchido (default '{}') = sempre disponível,
--    idêntico ao comportamento atual (aditivo, não quebra vendedor existente).
ALTER TABLE gestao_leads_sellers
    ADD COLUMN IF NOT EXISTS availability JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Regras da rodada + qualificação, por workspace. Fica fora de
--    core_workspaces de propósito — é config do módulo Leads, não do tenant
--    compartilhado entre apps (mesmo racional de gestao_leads_notification_configs).
CREATE TABLE IF NOT EXISTS gestao_leads_workspace_rules (
    workspace_id UUID PRIMARY KEY REFERENCES core_workspaces(id) ON DELETE CASCADE,
    respect_hours BOOLEAN NOT NULL DEFAULT false,
    skip_unavailable BOOLEAN NOT NULL DEFAULT true,
    queue_paused BOOLEAN NOT NULL DEFAULT false,
    qualification JSONB NOT NULL DEFAULT '{"enabled": false}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gestao_leads_workspace_rules ENABLE ROW LEVEL SECURITY;

-- 3. Checagem de disponibilidade em SQL — usada pelos dois RPCs de distribuição.
--    Mesma regra de precedência do handoff (availability.js): pausa manual →
--    férias → dia da semana → horário. Horário/dia calculados em
--    America/Sao_Paulo (mesma convenção de lib/leads/integrations/sheets.ts).
--    `p_respect_hours`/`p_skip_unavailable` vêm de gestao_leads_workspace_rules
--    e permitem desligar cada checagem por cliente (toggle do protótipo).
CREATE OR REPLACE FUNCTION seller_is_available(
    p_availability JSONB,
    p_respect_hours BOOLEAN,
    p_skip_unavailable BOOLEAN
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    now_local TIMESTAMP := (NOW() AT TIME ZONE 'America/Sao_Paulo');
    dow INT := EXTRACT(DOW FROM now_local)::INT; -- 0=domingo .. 6=sábado, igual Date.getDay() do JS
    minutes_now INT := EXTRACT(HOUR FROM now_local)::INT * 60 + EXTRACT(MINUTE FROM now_local)::INT;
    v_from TEXT := p_availability->'vacation'->>'from';
    v_to TEXT := p_availability->'vacation'->>'to';
    h_start TEXT := p_availability->'hours'->>'start';
    h_end TEXT := p_availability->'hours'->>'end';
    weekdays JSONB := p_availability->'weekdays';
BEGIN
    -- "Pular indisponível" desligado = ignora esta função inteira (todo mundo
    -- ativo entra na vez, comportamento atual preservado).
    IF NOT p_skip_unavailable THEN
        RETURN TRUE;
    END IF;

    -- Pausa manual do vendedor.
    IF COALESCE((p_availability->>'paused')::boolean, false) THEN
        RETURN FALSE;
    END IF;

    -- Férias/ausência (intervalo de datas).
    IF v_from IS NOT NULL AND v_to IS NOT NULL THEN
        IF now_local::date BETWEEN v_from::date AND v_to::date THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Dia da semana (vazio/ausente = atende todo dia).
    IF weekdays IS NOT NULL AND jsonb_array_length(weekdays) > 0 THEN
        IF NOT (weekdays @> to_jsonb(dow)) THEN
            RETURN FALSE;
        END IF;
    END IF;

    -- Horário de atendimento — só se o cliente ligou "Respeitar horário".
    IF p_respect_hours AND h_start IS NOT NULL AND h_end IS NOT NULL THEN
        IF minutes_now < (split_part(h_start, ':', 1)::int * 60 + split_part(h_start, ':', 2)::int)
           OR minutes_now > (split_part(h_end, ':', 1)::int * 60 + split_part(h_end, ':', 2)::int) THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$;

-- 4. Atualiza os dois RPCs de rodízio pra só considerar vendedores disponíveis.
--    queue_paused (workspace todo pausado) faz o RPC não achar candidato =
--    RETURNS SETOF vazio, o MESMO caso "waiting_seller" que já existe hoje
--    quando não há vendedor ativo — nenhuma mudança de contrato pro chamador.
CREATE OR REPLACE FUNCTION assign_next_seller(p_workspace_id UUID)
RETURNS SETOF gestao_leads_sellers
LANGUAGE plpgsql
AS $$
DECLARE
    r_respect_hours BOOLEAN;
    r_skip_unavailable BOOLEAN;
    r_queue_paused BOOLEAN;
BEGIN
    SELECT respect_hours, skip_unavailable, queue_paused
    INTO r_respect_hours, r_skip_unavailable, r_queue_paused
    FROM gestao_leads_workspace_rules
    WHERE workspace_id = p_workspace_id;

    -- Sem linha de regras ainda (cliente nunca configurou) = comportamento
    -- default: não respeita horário, pula indisponível, fila não pausada.
    r_respect_hours := COALESCE(r_respect_hours, false);
    r_skip_unavailable := COALESCE(r_skip_unavailable, true);
    r_queue_paused := COALESCE(r_queue_paused, false);

    IF r_queue_paused THEN
        RETURN;
    END IF;

    RETURN QUERY
    UPDATE gestao_leads_sellers s
    SET last_assigned_at = NOW()
    WHERE s.id = (
        SELECT id FROM gestao_leads_sellers
        WHERE workspace_id = p_workspace_id
          AND is_active = true
          AND seller_is_available(availability, r_respect_hours, r_skip_unavailable)
        ORDER BY last_assigned_at ASC NULLS FIRST
        FOR UPDATE SKIP LOCKED
        LIMIT 1
    )
    RETURNING s.*;
END;
$$;

CREATE OR REPLACE FUNCTION assign_next_seller_for_connection(p_connection_id UUID)
RETURNS SETOF gestao_leads_sellers
LANGUAGE plpgsql
AS $$
DECLARE
    v_workspace_id UUID;
    r_respect_hours BOOLEAN;
    r_skip_unavailable BOOLEAN;
    r_queue_paused BOOLEAN;
BEGIN
    SELECT workspace_id INTO v_workspace_id
    FROM gestao_leads_meta_connections
    WHERE id = p_connection_id;

    SELECT respect_hours, skip_unavailable, queue_paused
    INTO r_respect_hours, r_skip_unavailable, r_queue_paused
    FROM gestao_leads_workspace_rules
    WHERE workspace_id = v_workspace_id;

    r_respect_hours := COALESCE(r_respect_hours, false);
    r_skip_unavailable := COALESCE(r_skip_unavailable, true);
    r_queue_paused := COALESCE(r_queue_paused, false);

    IF r_queue_paused THEN
        RETURN;
    END IF;

    RETURN QUERY
    UPDATE gestao_leads_sellers s
    SET last_assigned_at = NOW()
    WHERE s.id = (
        SELECT s2.id FROM gestao_leads_sellers s2
        JOIN gestao_leads_seller_connections sc ON s2.id = sc.seller_id
        WHERE sc.connection_id = p_connection_id
          AND s2.is_active = true
          AND seller_is_available(s2.availability, r_respect_hours, r_skip_unavailable)
        ORDER BY s2.last_assigned_at ASC NULLS FIRST
        FOR UPDATE OF s2 SKIP LOCKED
        LIMIT 1
    )
    RETURNING s.*;
END;
$$;
