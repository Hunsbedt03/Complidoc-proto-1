import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAttachmentAccess } from '@/lib/attachments/access';
import {
  ATTACHMENTS_BUCKET,
  MAX_ATTACHMENT_BYTES,
} from '@/lib/attachments/constants';
import {
  buildAttachmentStoragePath,
  mapAttachmentRow,
} from '@/lib/attachments/mappers';
import { formatSupabaseError } from '@/lib/supabaseError';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const access = await requireAttachmentAccess(projectId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data, error } = await access.supabase
      .from('project_attachments')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    return NextResponse.json({
      attachments: (data ?? []).map((row) => mapAttachmentRow(row)),
      role: access.role,
      currentUserId: access.userId,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const access = await requireAttachmentAccess(projectId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Mangler fil' }, { status: 400 });
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json(
        { error: `Filen er for stor (maks ${Math.round(MAX_ATTACHMENT_BYTES / (1024 * 1024))} MB)` },
        { status: 400 }
      );
    }

    const displayName =
      String(formData.get('fileName') ?? '').trim() || file.name;
    const description = String(formData.get('description') ?? '').trim() || null;
    const linkedDocumentId =
      String(formData.get('linkedDocumentId') ?? '').trim() || null;

    let visibleToCustomer = false;
    if (access.role === 'supplier') {
      const raw = formData.get('visibleToCustomer');
      visibleToCustomer = raw === 'true' || raw === '1' || raw === 'on';
    }

    const mimeType = file.type || 'application/octet-stream';
    const storagePath = buildAttachmentStoragePath(projectId, file.name);
    const bytes = Buffer.from(await file.arrayBuffer());

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        { error: 'Supabase Storage er ikke konfigurert (mangler service role)' },
        { status: 503 }
      );
    }

    const { error: uploadError } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: formatSupabaseError(uploadError) },
        { status: 500 }
      );
    }

    const { data: row, error: insertError } = await access.supabase
      .from('project_attachments')
      .insert({
        project_id: projectId,
        file_path: storagePath,
        file_name: displayName,
        description,
        mime_type: mimeType,
        file_size: file.size,
        uploaded_by: access.userId,
        uploader_role: access.role,
        visible_to_customer: visibleToCustomer,
        linked_document_id: linkedDocumentId,
      })
      .select('*')
      .single();

    if (insertError) {
      await admin.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: formatSupabaseError(insertError) },
        { status: 500 }
      );
    }

    return NextResponse.json({ attachment: mapAttachmentRow(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
