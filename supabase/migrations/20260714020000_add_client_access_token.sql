-- Token de acesso do cliente (sem sistema de login completo) — permite uma
-- "área de membros" mínima onde o cliente (Karol, Mega Invest, etc.) entra
-- por um link único e controla apenas a fila da vez (ativar/desativar
-- vendedor) do PRÓPRIO workspace. O banco continua sendo o único decisor do
-- round robin — o cliente só liga/desliga, nunca edita quem é o próximo.
ALTER TABLE core_workspaces ADD COLUMN IF NOT EXISTS client_access_token TEXT UNIQUE;

-- Gera um token para workspaces que ainda não têm (idempotente).
UPDATE core_workspaces
SET client_access_token = encode(gen_random_bytes(24), 'hex')
WHERE client_access_token IS NULL;
