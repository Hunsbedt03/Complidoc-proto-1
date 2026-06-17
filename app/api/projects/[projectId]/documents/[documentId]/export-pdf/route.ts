import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkSubscriptionActive } from '@/lib/auth/subscription';
import { loadRevisionForExport } from '@/lib/export/revisionExport';
import type { DocumentId } from '@/lib/documents/ids';
import { formatSupabaseError } from '@/lib/supabaseError';

export const runtime = 'nodejs';

type RouteParams = { params: Promise<{ projectId: string; documentId: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { projectId, documentId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const subCheck = await checkSubscriptionActive(user.id);
    if (!subCheck.active) {
      return NextResponse.json(
        { error: subCheck.reason ?? 'Ingen aktivt abonnement' },
        { status: 403 }
      );
    }

    const loaded = await loadRevisionForExport(
      user.id,
      projectId,
      documentId as DocumentId
    );
    if ('error' in loaded) {
      return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    }

    const { exportBlocksToPdf } = await import('@/lib/pdf-export');
    const buffer = await exportBlocksToPdf(loaded.blocks, loaded.meta);
    const filename = `${loaded.filenameBase}.pdf`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
