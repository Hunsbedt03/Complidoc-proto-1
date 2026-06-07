import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatSupabaseError } from '@/lib/supabaseError';
import type { UploadSlot } from '@/lib/types';

const BUCKET = 'project-documents';

type Body = {
  projectId: string;
  documentId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  fileBase64: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const { projectId, documentId, fileName, mimeType, fileSize, fileBase64 } =
      body;

    if (!projectId || !documentId || !fileName || !fileBase64) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Ikke innlogget', storage: 'local' as const },
        { status: 401 }
      );
    }

    const bytes = Buffer.from(fileBase64, 'base64');
    const storagePath = `${projectId}/${documentId}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    const admin = createAdminClient();
    if (!admin) {
      return NextResponse.json(
        {
          storage: 'local' as const,
          setupRequired: true,
          error: 'Supabase Storage ikke konfigurert — lagrer lokalt i nettleseren',
        },
        { status: 503 }
      );
    }

    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, bytes, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          storage: 'local' as const,
          setupRequired: true,
          error: formatSupabaseError(uploadError),
        },
        { status: 503 }
      );
    }

    await admin
      .from('uploaded_documents')
      .update({ is_current: false, superseded_at: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('document_id', documentId)
      .eq('is_current', true);

    const { data: record, error: insertError } = await admin
      .from('uploaded_documents')
      .insert({
        project_id: projectId,
        document_id: documentId,
        file_name: fileName,
        file_path: storagePath,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: user.id,
        is_current: true,
      })
      .select('id, file_name, file_path, file_size, mime_type, uploaded_at')
      .single();

    if (insertError) {
      return NextResponse.json(
        {
          storage: 'local' as const,
          error: formatSupabaseError(insertError),
        },
        { status: 503 }
      );
    }

    const slot: UploadSlot = {
      documentId,
      status: 'uploaded',
      fileName: record.file_name,
      uploadedAt: record.uploaded_at,
      fileSize: record.file_size ?? fileSize,
      filePath: record.file_path,
      storageRecordId: record.id,
      mimeType: record.mime_type ?? mimeType,
    };

    return NextResponse.json({ slot, storage: 'supabase' as const });
  } catch (err) {
    return NextResponse.json(
      { error: formatSupabaseError(err) },
      { status: 500 }
    );
  }
}
