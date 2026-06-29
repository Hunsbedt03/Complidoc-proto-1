import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAttachmentAccess } from '@/lib/attachments/access';
import {
  ATTACHMENTS_BUCKET,
  SIGNED_URL_TTL_SEC,
} from '@/lib/attachments/constants';
import { formatSupabaseError } from '@/lib/supabaseError';

type RouteParams = {
  params: Promise<{ projectId: string; id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { projectId, id } = await params;
    const access = await requireAttachmentAccess(projectId);
    if ('error' in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(request.url);
    const signed = searchParams.get('signed') === '1';

    const { data: row, error } = await access.supabase
      .from('project_attachments')
      .select('file_path, file_name, mime_type')
      .eq('id', id)
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }
    if (!row) {
      return NextResponse.json({ error: 'Vedlegg ikke funnet' }, { status: 404 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Storage ikke konfigurert' }, { status: 503 });
    }

    if (signed) {
      const { data: signedData, error: signErr } = await admin.storage
        .from(ATTACHMENTS_BUCKET)
        .createSignedUrl(row.file_path, SIGNED_URL_TTL_SEC, {
          download: row.file_name,
        });

      if (signErr || !signedData?.signedUrl) {
        return NextResponse.json(
          { error: formatSupabaseError(signErr ?? 'Signert URL feilet') },
          { status: 500 }
        );
      }

      return NextResponse.json({
        url: signedData.signedUrl,
        fileName: row.file_name,
        mimeType: row.mime_type ?? 'application/octet-stream',
      });
    }

    const { data: blob, error: dlErr } = await admin.storage
      .from(ATTACHMENTS_BUCKET)
      .download(row.file_path);

    if (dlErr || !blob) {
      return NextResponse.json(
        { error: formatSupabaseError(dlErr) },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const mime = row.mime_type ?? 'application/octet-stream';
    const isImage = mime.startsWith('image/');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': isImage
          ? `inline; filename="${row.file_name}"`
          : `attachment; filename="${row.file_name}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
