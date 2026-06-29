import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAttachmentAccess } from '@/lib/attachments/access';
import { ATTACHMENTS_BUCKET } from '@/lib/attachments/constants';
import { mapAttachmentRow } from '@/lib/attachments/mappers';
import { formatSupabaseError } from '@/lib/supabaseError';

type RouteParams = {
  params: Promise<{ projectId: string; id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { projectId, id } = await params;
    const access = await requireAttachmentAccess(projectId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = (await request.json()) as {
      description?: string | null;
      visibleToCustomer?: boolean;
      linkedDocumentId?: string | null;
    };

    const patch: Record<string, unknown> = {};

    if (body.description !== undefined) {
      patch.description =
        body.description == null ? null : String(body.description).trim() || null;
    }

    if (access.role === 'supplier') {
      if (body.visibleToCustomer !== undefined) {
        patch.visible_to_customer = Boolean(body.visibleToCustomer);
      }
      if (body.linkedDocumentId !== undefined) {
        patch.linked_document_id =
          body.linkedDocumentId == null || body.linkedDocumentId === ''
            ? null
            : String(body.linkedDocumentId).trim();
      }
    } else if (
      body.visibleToCustomer !== undefined ||
      body.linkedDocumentId !== undefined
    ) {
      return NextResponse.json(
        { error: 'Kunder kan ikke endre synlighet eller dokumentkobling' },
        { status: 403 }
      );
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Ingen felter å oppdatere' }, { status: 400 });
    }

    const { data, error } = await access.supabase
      .from('project_attachments')
      .update(patch)
      .eq('id', id)
      .eq('project_id', projectId)
      .select('*')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Vedlegg ikke funnet' }, { status: 404 });
    }

    return NextResponse.json({ attachment: mapAttachmentRow(data) });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { projectId, id } = await params;
    const access = await requireAttachmentAccess(projectId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { data: row, error: fetchError } = await access.supabase
      .from('project_attachments')
      .select('file_path')
      .eq('id', id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (fetchError) {
      return NextResponse.json({ error: formatSupabaseError(fetchError) }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: 'Vedlegg ikke funnet' }, { status: 404 });
    }

    const { error: deleteError } = await access.supabase
      .from('project_attachments')
      .delete()
      .eq('id', id)
      .eq('project_id', projectId);

    if (deleteError) {
      return NextResponse.json({ error: formatSupabaseError(deleteError) }, { status: 500 });
    }

    const admin = createAdminClient();
    if (admin && row.file_path) {
      await admin.storage.from(ATTACHMENTS_BUCKET).remove([row.file_path]);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
