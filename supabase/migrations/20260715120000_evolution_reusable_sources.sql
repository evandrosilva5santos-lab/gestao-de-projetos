-- Torna a conexão Evolution/WhatsApp reutilizável entre clientes, no mesmo padrão
-- já usado pelo Meta (gestao_leads_sources): conecta uma vez, reutiliza em N
-- workspaces, sem recolar credenciais nem rebuscar grupos por cliente.
--
-- O histórico de grupos (gestao_leads_whatsapp_groups) passa a pertencer à
-- CONEXÃO (source_id), não ao workspace — o mesmo número de WhatsApp/instância
-- é compartilhado por vários clientes, então os grupos só precisam ser
-- buscados uma vez por instância, não uma vez por cliente.

-- 1. Cria a(s) conexão(ões) Evolution existentes em gestao_leads_sources, uma por
--    combinação distinta de credenciais já usada em gestao_leads_destinations.
insert into gestao_leads_sources (provider_type, name, credentials, status, last_validated_at)
select
  'evolution',
  coalesce(config->>'instanceName', 'Evolution API'),
  jsonb_build_object(
    'url', config->>'url',
    'token', config->>'token',
    'instanceName', config->>'instanceName'
  ),
  'active',
  now()
from (
  select distinct on (config->>'url', config->>'token', config->>'instanceName')
    config
  from gestao_leads_destinations
  where type = 'evolution'
) distinct_configs;

-- 2. Repõe o histórico de grupos: adiciona source_id e faz o backfill mapeando
--    pela credencial idêntica (mesmo url/token/instanceName do destino que
--    originou a busca).
alter table gestao_leads_whatsapp_groups add column if not exists source_id uuid references gestao_leads_sources(id) on delete cascade;

update gestao_leads_whatsapp_groups g
set source_id = s.id
from gestao_leads_destinations d
join gestao_leads_sources s
  on s.provider_type = 'evolution'
  and s.credentials->>'url' = d.config->>'url'
  and s.credentials->>'token' = d.config->>'token'
  and s.credentials->>'instanceName' = d.config->>'instanceName'
where d.type = 'evolution'
  and d.workspace_id = g.workspace_id
  and g.source_id is null;

-- Fallback: se por algum motivo não achou par (ex.: grupo buscado antes do
-- destino existir), associa à única fonte Evolution existente.
update gestao_leads_whatsapp_groups
set source_id = (select id from gestao_leads_sources where provider_type = 'evolution' order by created_at asc limit 1)
where source_id is null;

alter table gestao_leads_whatsapp_groups alter column source_id set not null;

-- 3. Troca a chave de identidade: era (workspace_id, group_jid), passa a ser
--    (source_id, group_jid). group_jid já era UNIQUE globalmente por acidente
--    de design (mesma migration original), então não há dado a colidir aqui.
alter table gestao_leads_whatsapp_groups drop constraint if exists gestao_leads_whatsapp_groups_workspace_id_group_jid_key;
drop index if exists idx_whatsapp_groups_workspace;

alter table gestao_leads_whatsapp_groups drop column if exists workspace_id;

alter table gestao_leads_whatsapp_groups add constraint gestao_leads_whatsapp_groups_source_id_group_jid_key unique (source_id, group_jid);

create index if not exists idx_whatsapp_groups_source on gestao_leads_whatsapp_groups(source_id);
