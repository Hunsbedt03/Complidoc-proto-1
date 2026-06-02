import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProsjektSummary, SaveProjectPayload } from './types';

export async function ensureBedrift(
  supabase: SupabaseClient,
  userId: string,
  existingBedriftId: string | null,
  produsentNavn: string
): Promise<string> {
  if (existingBedriftId) return existingBedriftId;

  const navn = (produsentNavn || 'Min bedrift').trim() || 'Min bedrift';
  const { data: bedrift, error: bErr } = await supabase
    .from('bedrifter')
    .insert({ navn })
    .select('id')
    .single();
  if (bErr) throw bErr;

  const { error: linkErr } = await supabase.from('brukere_bedrifter').insert({
    user_id: userId,
    bedrift_id: bedrift.id,
    rolle: 'admin',
  });
  if (linkErr) throw linkErr;

  return bedrift.id;
}

export async function loadProjects(
  supabase: SupabaseClient,
  userId: string
): Promise<ProsjektSummary[]> {
  const { data, error } = await supabase
    .from('prosjekter')
    .select('id, navn, produsent, status, created_at, zip_filename')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function saveGeneratedProject(
  supabase: SupabaseClient,
  userId: string,
  bedriftId: string | null,
  payload: SaveProjectPayload
): Promise<string> {
  const bId = await ensureBedrift(supabase, userId, bedriftId, payload.produsent);

  const { data: maskin, error: mErr } = await supabase
    .from('maskiner')
    .insert({
      user_id: userId,
      bedrift_id: bId,
      navn: payload.maskin,
      serienummer: payload.serienr,
      beskrivelse: payload.beskrivelse,
      drivsystem: payload.drivsystem,
      styring: payload.styring,
      installasjonsmiljo: payload.installasjonsmiljo,
      tiltenkt_bruk: payload.tiltenktbruk,
      standarder: payload.standarder,
      marked: payload.marked,
    })
    .select('id')
    .single();
  if (mErr) throw mErr;

  const { data: prosjekt, error: pErr } = await supabase
    .from('prosjekter')
    .insert({
      user_id: userId,
      bedrift_id: bId,
      maskin_id: maskin.id,
      navn: payload.prosjekt,
      kunde: payload.kunde,
      produsent: payload.produsent,
      ingenior: payload.ingenior,
      status: 'fullført',
      machine_data: payload.machineData,
      zip_filename: payload.zipFilename,
      zip_base64: payload.zipBase64,
    })
    .select('id')
    .single();
  if (pErr) throw pErr;

  const docRows = payload.documents.map((d) => ({
    prosjekt_id: prosjekt.id,
    user_id: userId,
    doc_type: d.docType,
    filename: d.filename,
    docx_base64: d.docx,
  }));

  const { error: dErr } = await supabase.from('dokumenter').insert(docRows);
  if (dErr) throw dErr;

  return prosjekt.id;
}

export async function loadProjectZip(
  supabase: SupabaseClient,
  userId: string,
  projectId: string
): Promise<{ title: string; zip: string; filename: string } | null> {
  const { data: prosjekt, error } = await supabase
    .from('prosjekter')
    .select('navn, zip_base64, zip_filename')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  if (error || !prosjekt?.zip_base64) return null;

  return {
    title: prosjekt.navn || 'Prosjekt',
    zip: prosjekt.zip_base64,
    filename: prosjekt.zip_filename || 'Samsiq.zip',
  };
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('no-NO');
  } catch {
    return '';
  }
}

export async function getBedriftId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('brukere_bedrifter')
    .select('bedrift_id')
    .eq('user_id', userId)
    .limit(1);
  return data?.[0]?.bedrift_id ?? null;
}
