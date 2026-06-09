import { NextResponse } from 'next/server';
import { getCompanyProfileId } from '@/lib/archive/autoLink';
import {
  defaultArchiveCategory,
  defaultArchiveLabel,
  defaultIsoCerts,
  mapDbToArchiveDocument,
} from '@/lib/archive/mappers';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@/lib/supabaseError';

const BUCKET = 'company-archive';

type Body = {
  documentTypeId: string;
  label?: string;
  version?: string;
  validFrom?: string;
  validUntil?: string;
  isoCertifications?: string[];
  reviewIntervalMonths?: number;
  tags?: string[];
  notes?: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileBase64: string;
  replaceExistingId?: string;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as Body;
    if (!body.documentTypeId || !body.fileName || !body.fileBase64) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
    }
    body.documentTypeId = body.documentTypeId.trim().toLowerCase();

    const companyId = await getCompanyProfileId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json(
        {
          error: 'Opprett bedriftsprofil under Innstillinger først',
          storage: 'local' as const,
        },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { storage: 'local' as const, setupRequired: true },
        { status: 503 }
      );
    }

    if (body.replaceExistingId) {
      await admin
        .from('company_archive')
        .update({ is_active: false })
        .eq('id', body.replaceExistingId)
        .eq('company_id', companyId);
    } else {
      await admin
        .from('company_archive')
        .update({ is_active: false })
        .eq('company_id', companyId)
        .eq('document_type_id', body.documentTypeId)
        .eq('is_active', true);
    }

    const bytes = Buffer.from(body.fileBase64, 'base64');
    const storagePath = `${companyId}/${body.documentTypeId}/${Date.now()}_${body.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: body.mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { storage: 'local' as const, error: formatSupabaseError(uploadError) },
        { status: 503 }
      );
    }

    const { data: row, error: insertErr } = await admin
      .from('company_archive')
      .insert({
        company_id: companyId,
        document_type_id: body.documentTypeId,
        label: body.label?.trim() || defaultArchiveLabel(body.documentTypeId),
        category: defaultArchiveCategory(body.documentTypeId),
        file_name: body.fileName,
        file_path: storagePath,
        file_size: body.fileSize,
        mime_type: body.mimeType,
        version: body.version?.trim() || 'v1',
        valid_from: body.validFrom || null,
        valid_until: body.validUntil || null,
        iso_certifications:
          body.isoCertifications ?? defaultIsoCerts(body.documentTypeId),
        uploaded_by: user.id,
        review_interval_months: body.reviewIntervalMonths ?? null,
        tags: body.tags ?? [],
        notes: body.notes?.trim() || null,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertErr) {
      return NextResponse.json({ error: formatSupabaseError(insertErr) }, { status: 500 });
    }

    if (body.replaceExistingId) {
      await admin
        .from('company_archive')
        .update({ superseded_by: row.id })
        .eq('id', body.replaceExistingId);

      await admin.rpc('update_archive_links', {
        old_archive_id: body.replaceExistingId,
        new_archive_id: row.id,
      });
    }

    return NextResponse.json({
      document: mapDbToArchiveDocument(row),
      storage: 'cloud' as const,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
