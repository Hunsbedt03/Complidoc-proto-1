import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import { getCompanyProfileId } from '@/lib/archive/autoLink';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@/lib/supabaseError';

const BUCKET = 'company-archive';
const SIGNED_URL_TTL_SEC = 3600;

function isPdf(mime: string, fileName: string): boolean {
  return (
    mime === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')
  );
}

function isDocx(mime: string, fileName: string): boolean {
  return (
    mime.includes('wordprocessingml') ||
    mime === 'application/msword' ||
    fileName.toLowerCase().endsWith('.docx') ||
    fileName.toLowerCase().endsWith('.doc')
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const archiveId = searchParams.get('id');
    if (!archiveId) {
      return NextResponse.json({ error: 'Mangler id' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const companyId = await getCompanyProfileId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({ error: 'Ingen bedriftsprofil' }, { status: 404 });
    }

    const { data: row, error } = await supabase
      .from('company_archive')
      .select('file_path, file_name, mime_type, label')
      .eq('id', archiveId)
      .eq('company_id', companyId)
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: 'Dokument ikke funnet' }, { status: 404 });
    }

    const mime = row.mime_type ?? 'application/octet-stream';
    const fileName = row.file_name;

    if (isPdf(mime, fileName)) {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json({ error: 'Storage ikke konfigurert' }, { status: 503 });
      }

      const { data: signedData, error: signErr } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.file_path, SIGNED_URL_TTL_SEC, {
          download: false,
        });

      if (signErr || !signedData?.signedUrl) {
        return NextResponse.json(
          { error: formatSupabaseError(signErr ?? 'Signert URL feilet') },
          { status: 500 }
        );
      }

      return NextResponse.json({
        mode: 'pdf' as const,
        url: signedData.signedUrl,
        fileName,
        label: row.label,
      });
    }

    if (isDocx(mime, fileName)) {
      const admin = createAdminClient();
      if (!admin) {
        return NextResponse.json({ error: 'Storage ikke konfigurert' }, { status: 503 });
      }

      const { data: blob, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(row.file_path);

      if (dlErr || !blob) {
        return NextResponse.json(
          { error: formatSupabaseError(dlErr) },
          { status: 500 }
        );
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const result = await mammoth.convertToHtml({ buffer });

      return NextResponse.json({
        mode: 'docx' as const,
        html: result.value,
        fileName,
        label: row.label,
        messages: result.messages.map((m) => m.message),
      });
    }

    return NextResponse.json(
      {
        error: 'Forhåndsvisning støttes kun for PDF og DOCX',
        mimeType: mime,
        fileName,
      },
      { status: 415 }
    );
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
