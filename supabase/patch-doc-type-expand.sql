-- Utvid dokumenter.doc_type til alle Samsiq-dokument-ID-er (ikke bare risk|tech|doc|qc).
-- Kjør i Supabase SQL Editor etter deploy av utvidet dokumentpakke.

alter table public.dokumenter
  drop constraint if exists dokumenter_doc_type_check;

alter table public.dokumenter
  add constraint dokumenter_doc_type_check
  check (char_length(doc_type) >= 1 and char_length(doc_type) <= 64);
