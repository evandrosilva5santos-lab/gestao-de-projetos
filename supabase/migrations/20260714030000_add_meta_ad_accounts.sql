create table gestao_leads_meta_ad_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core_workspaces(id) on delete cascade,
  ad_account_id text not null, -- act_xxx format
  ad_account_name text not null,
  bm_token_hash text not null, -- hash of BM token (never store plaintext)
  created_at timestamp default now(),
  updated_at timestamp default now(),

  unique(workspace_id, ad_account_id)
);

create index idx_gestao_leads_meta_ad_accounts_workspace_id on gestao_leads_meta_ad_accounts(workspace_id);
create index idx_gestao_leads_meta_ad_accounts_ad_account_id on gestao_leads_meta_ad_accounts(ad_account_id);
