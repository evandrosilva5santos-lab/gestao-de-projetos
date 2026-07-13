-- Alterando a tabela core_workspace_users para comportar os dados dos vendedores/consultores
ALTER TABLE core_workspace_users 
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_assigned_at TIMESTAMPTZ;

-- Adicionando configurações de WhatsApp/Evolution API por workspace (multi-tenant)
ALTER TABLE core_workspaces
ADD COLUMN IF NOT EXISTS whatsapp_config JSONB NOT NULL DEFAULT '{}'::jsonb;
