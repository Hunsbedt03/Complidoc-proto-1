-- Prompt 19: language + structured_data on document_revisions
-- Kjør manuelt i Supabase SQL Editor

ALTER TABLE document_revisions
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'no'
    CHECK (language IN ('no', 'en'));

ALTER TABLE document_revisions
  ADD COLUMN IF NOT EXISTS structured_data jsonb;

ALTER TABLE revision_cycle_document_snapshots
  ADD COLUMN IF NOT EXISTS structured_data jsonb;

COMMENT ON COLUMN document_revisions.language IS 'Dokumentspråk: no eller en';
COMMENT ON COLUMN document_revisions.structured_data IS 'Strukturert JSON for tabell-typer (fmea, hazard_register, safety_function_analysis)';
