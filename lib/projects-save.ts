import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SaveProjectPayload } from './types';
import { formatSupabaseError, supabaseErrorFields } from './supabaseError';
import { storageDocType } from './documents/ids';

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
      (o.message.includes('ensure_user_profile') ||
        o.message.includes('Could not find the function')))
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

export async function saveGeneratedProject(
  supabase: SupabaseClient,
  userId: string,
  payload: SaveProjectPayload,
  options?: { skipProfileEnsure?: boolean }
): Promise<{
  projectId: string;
  skippedDocumentTypes: string[];
  insertedCount: number;
}> {
  if (!options?.skipProfileEnsure) {
    await ensureUserProfile(supabase, userId);
  }

  // Samme bro som backfill: company_profiles.user_id = prosjekter.user_id
  const { data: companyProfile, error: cpErr } = await supabase
    .from('company_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (cpErr) throwSaveError('H3-company_profiles', cpErr, { userId });
  if (!companyProfile?.id) {
    throw new Error(
      'Mangler bedriftsprofil (company_profiles). Fullfør onboarding før prosjekt lagres.'
    );
  }

  const { data: prosjekt, error: pErr } = await supabase
    .from('prosjekter')
    .insert({
      user_id: userId,
      company_profile_id: companyProfile.id,
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
  if (pErr) throwSaveError('H3-prosjekter', pErr);

  const skippedTypes: string[] = [];
  let insertedCount = 0;

  const docRows = payload.documents.map((d) => ({
    prosjekt_id: prosjekt.id,
    user_id: userId,
    doc_type: storageDocType(d),
    filename: d.filename,
    docx_base64: d.docx,
  }));

  const { error: batchErr } = await supabase.from('dokumenter').insert(docRows);
  if (!batchErr) {
    insertedCount = docRows.length;
  } else {
    for (let i = 0; i < payload.documents.length; i++) {
      const d = payload.documents[i];
      const storedType = storageDocType(d);

      const { error: dErr } = await supabase.from('dokumenter').insert({
        prosjekt_id: prosjekt.id,
        user_id: userId,
        doc_type: storedType,
        filename: d.filename,
        docx_base64: d.docx,
      });
      if (dErr) {
        const errCode = (dErr as { code?: string }).code;
        if (errCode === '23514') {
          skippedTypes.push(storedType);
          continue;
        }
        throwSaveError('H4-dokumenter', dErr, {
          rowIndex: i,
          docType: storedType,
          docxLen: d.docx?.length ?? 0,
        });
      }
      insertedCount += 1;
    }
  }

  if (insertedCount === 0) {
    throw new Error(
      'Kunne ikke lagre dokumenter. Kjør supabase/patch-doc-type-expand.sql i Supabase SQL Editor.'
    );
  }

  return {
    projectId: prosjekt.id,
    skippedDocumentTypes: skippedTypes,
    insertedCount,
  };
}
