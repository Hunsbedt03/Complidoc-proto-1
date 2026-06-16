import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdminClient } from '@/lib/supabase/requireAdmin';
import { formatSupabaseError } from '@/lib/supabaseError';
import type {
  DocumentRevision,
  RevisionChangeType,
  RevisionSource,
} from '@/lib/revisions';

export const runtime = 'nodejs';

type DbRevision = {
  id: string;
  project_id: string;
  document_id: string;
  revision: number;
  content: string;
  content_json: unknown;
  change_type: RevisionChangeType;
  change_note: string;
  changed_by: string | null;
  changed_by_name: string;
  changed_at: string;
  source: RevisionSource;
};

function mapRow(row: DbRevision): DocumentRevision {
  return {
    id: row.id,
    projectId: row.project_id,
    documentId: row.document_id,
    revision: row.revision,
    content: row.content,
    contentJson:
      row.content_json != null ? JSON.stringify(row.content_json) : undefined,
    changeType: row.change_type,
    changeNote: row.change_note,
    changedBy: row.changed_by ?? 'unknown',
    changedByName: row.changed_by_name,
    changedAt: row.changed_at,
    source: row.source,
  };
}

async function assertProjectAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  _userId: string,
  projectId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('prosjekter')
    .select('id')
    .eq('id', projectId)
    .maybeSingle();
  return !!data?.id;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const documentId = searchParams.get('documentId');

    if (!projectId) {
      return NextResponse.json({ error: 'Mangler projectId' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const allowed = await assertProjectAccess(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const db = requireAdminClient();

    let query = db
      .from('document_revisions')
      .select('*')
      .eq('project_id', projectId);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    const { data, error } = await query.order(
      documentId ? 'revision' : 'changed_at',
      { ascending: false }
    );

    if (error) {
      const msg = formatSupabaseError(error);
      const missing =
        msg.includes('document_revisions') ||
        msg.includes('PGRST205') ||
        msg.includes('42P01');
      if (missing) {
        return NextResponse.json(
          {
            revisions: [] as DocumentRevision[],
            setupRequired: true,
            error: 'Kjør supabase/patch-document-revisions.sql i Supabase',
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({
      revisions: (data as DbRevision[]).map(mapRow),
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
      documentId?: string;
      content?: string;
      contentJson?: string;
      changeNote?: string;
      changeType?: RevisionChangeType;
      changedByName?: string;
      source?: RevisionSource;
    };

    const {
      projectId,
      documentId,
      content,
      contentJson,
      changeNote,
      changeType,
      changedByName,
      source,
    } = body;

    if (
      !projectId ||
      !documentId ||
      content == null ||
      !changeNote?.trim() ||
      !changeType ||
      !source
    ) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const allowed = await assertProjectAccess(supabase, user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const db = requireAdminClient();

    const { data: latest } = await db
      .from('document_revisions')
      .select('revision')
      .eq('project_id', projectId)
      .eq('document_id', documentId)
      .order('revision', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextRevision = (latest?.revision ?? 0) + 1;

    let parsedJson: unknown = null;
    if (contentJson) {
      try {
        parsedJson = JSON.parse(contentJson);
      } catch {
        parsedJson = null;
      }
    }

    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const displayName =
      changedByName?.trim() ||
      (typeof meta?.full_name === 'string' && meta.full_name) ||
      user.email ||
      'Ukjent';

    const { data: inserted, error: insertError } = await db
      .from('document_revisions')
      .insert({
        project_id: projectId,
        document_id: documentId,
        revision: nextRevision,
        content,
        content_json: parsedJson,
        change_type: changeType,
        change_note: changeNote.trim(),
        changed_by: user.id,
        changed_by_name: displayName,
        source,
      })
      .select('*')
      .single();

    if (insertError) {
      const msg = formatSupabaseError(insertError);
      const missing =
        msg.includes('document_revisions') ||
        msg.includes('PGRST205') ||
        msg.includes('42P01');
      return NextResponse.json(
        {
          error: missing
            ? 'Kjør supabase/migrations/20260610_document_revisions.sql i Supabase'
            : msg,
        },
        { status: missing ? 503 : 500 }
      );
    }

    return NextResponse.json({
      revision: mapRow(inserted as DbRevision),
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
