import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProsjektSummary, SaveProjectPayload } from './types';
import { formatSupabaseError, supabaseErrorFields } from './supabaseError';
import { rebuildZipFromDocs } from './rebuildZip';
import type { GeneratedDoc } from './types';

function logSaveStepFailure(
  step: string,
  err: unknown,
  extra?: Record<string, unknown>
): void {
  const fields = supabaseErrorFields(err);
  console.error('[samsiq] Supabase lagring —', step, fields, extra ?? '');
}

function isMissingRpcError(err: unknown): boolean {
  const o = err as { code?: string; message?: string };
  return (
    o?.code === 'PGRST202' ||
    o?.code === '42883' ||
    (typeof o?.message === 'string' &&
      (o.message.includes('ensure_user_profile') || o.message.includes('Could not find the function')))
  );
}

function throwSaveError(
  step: string,
  err: unknown,
  extra?: Record<string, unknown>
): never {
  logSaveStepFailure(step, err, extra);
  throw new Error(formatSupabaseError(err));
}

/** Sikrer rad i public.users (FK for prosjekter, dokumenter). */
export async function ensureUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (authErr) throwSaveError('H2-auth', authErr);
  if (!user || user.id !== userId) throw new Error('Ikke innlogget');

  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const fullName =
    (typeof meta?.full_name === 'string' && meta.full_name) ||
    (typeof meta?.fullName === 'string' && meta.fullName) ||
    null;
  const profile = {
    id: userId,
    email: user.email ?? '',
    full_name: fullName,
  };

  const { data: existing, error: selectErr } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  if (selectErr) throwSaveError('H2-users-select', selectErr, { userId });

  if (existing?.id) {
    const { error: updateErr } = await supabase.from('users').update(profile).eq('id', userId);
    if (updateErr) throwSaveError('H2-users-update', updateErr, { userId });
    return;
  }

  const { error: rpcErr } = await supabase.rpc('ensure_user_profile');
  if (!rpcErr) {
    return;
  }
  if (!isMissingRpcError(rpcErr)) throwSaveError('H2-users-rpc', rpcErr, { userId });

  const { error: insertErr } = await supabase.from('users').insert(profile);
  if (!insertErr) {
    return;
  }

  const code = (insertErr as { code?: string }).code;
  if (code === '42501') {
    throw new Error(
      'Database mangler oppsett for brukerprofiler. Kjør supabase/patch-ensure-user-profile.sql i Supabase SQL Editor, eller legg SUPABASE_SERVICE_ROLE_KEY i .env.local.'
    );
  }
  throwSaveError('H2-users-insert', insertErr, { userId });
}

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
  if (bErr) throwSaveError('H5-bedrifter', bErr);

  const { error: linkErr } = await supabase.from('brukere_bedrifter').insert({
    user_id: userId,
    bedrift_id: bedrift.id,
    rolle: 'admin',
  });
  if (linkErr) throwSaveError('H5-brukere_bedrifter', linkErr);

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
  if (error) {
    throwSaveError('loadProjects', error, { userId });
  }
  return data || [];
}

export async function saveGeneratedProject(
  supabase: SupabaseClient,
  userId: string,
  bedriftId: string | null,
  payload: SaveProjectPayload,
  options?: { skipProfileEnsure?: boolean }
): Promise<string> {
  if (!options?.skipProfileEnsure) {
    await ensureUserProfile(supabase, userId);
  }
  const { data: prosjekt, error: pErr } = await supabase
    .from('prosjekter')
    .insert({
      user_id: userId,
      bedrift_id: bedriftId,
      maskin_id: null,
      navn: payload.prosjekt,
      kunde: payload.kunde,
      produsent: payload.produsent,
      ingenior: payload.ingenior,
      status: 'fullført',
      machine_data: payload.machineData,
      zip_filename: payload.zipFilename,
      zip_base64: null,
    })
    .select('id')
    .single();
  if (pErr) throwSaveError('H3-prosjekter', pErr, { zipLen: 0 });

  for (let i = 0; i < payload.documents.length; i++) {
    const d = payload.documents[i];
    const { error: dErr } = await supabase.from('dokumenter').insert({
      prosjekt_id: prosjekt.id,
      user_id: userId,
      doc_type: d.docType,
      filename: d.filename,
      docx_base64: d.docx,
    });
    if (dErr) {
      throwSaveError('H4-dokumenter', dErr, {
        rowIndex: i,
        docType: d.docType,
        docxLen: d.docx?.length ?? 0,
      });
    }
  }

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
  if (error || !prosjekt) return null;

  const title = prosjekt.navn || 'Prosjekt';
  const filename = prosjekt.zip_filename || 'Samsiq.zip';

  if (prosjekt.zip_base64) {
    return { title, zip: prosjekt.zip_base64, filename };
  }

  const { data: docs, error: dErr } = await supabase
    .from('dokumenter')
    .select('doc_type, filename, docx_base64')
    .eq('prosjekt_id', projectId)
    .eq('user_id', userId);
  if (dErr || !docs?.length) return null;

  const documents: GeneratedDoc[] = docs.map((d) => ({
    docType: d.doc_type as GeneratedDoc['docType'],
    filename: d.filename,
    docx: d.docx_base64,
  }));
  const zipData = await rebuildZipFromDocs(documents, filename);
  return { title, zip: zipData.zip, filename: zipData.filename };
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
