import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatSupabaseError } from '@/lib/supabaseError';

const BUCKET = 'project-documents';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const recordId = new URL(request.url).searchParams.get('recordId');
    if (!recordId) {
      return NextResponse.json({ error: 'Mangler recordId' }, { status: 400 });
    }

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json({ error: 'Storage ikke konfigurert' }, { status: 503 });
    }

    const { data: record, error: fetchError } = await admin
      .from('uploaded_documents')
      .select('file_path, file_name, mime_type')
      .eq('id', recordId)
      .single();

    if (fetchError || !record) {
      return NextResponse.json({ error: 'Fant ikke fil' }, { status: 404 });
    }

    const { data: blob, error: dlError } = await admin.storage
      .from(BUCKET)
      .download(record.file_path);

    if (dlError || !blob) {
      return NextResponse.json(
        { error: formatSupabaseError(dlError) },
        { status: 500 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': record.mime_type ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${record.file_name}"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
