-- Camada 1 de deduplicação: identifica o EVENTO do Meta (leadgen_id), não a pessoa.
-- Sem isso, um retry de webhook do Meta (mesmo leadgen_id) reprocessaria o lead
-- inteiro: nova linha na planilha, novo deal no Kommo, nova mensagem no WhatsApp.
ALTER TABLE gestao_leads ADD COLUMN IF NOT EXISTS leadgen_id TEXT;

-- Único por workspace + leadgen_id (quando presente) — garante que o MESMO evento
-- do Meta nunca gera 2 leads no banco, mas permite reentradas (leadgen_id novo)
-- da mesma pessoa dias depois.
CREATE UNIQUE INDEX IF NOT EXISTS idx_gestao_leads_leadgen_id_unique
  ON gestao_leads (workspace_id, leadgen_id)
  WHERE leadgen_id IS NOT NULL;
