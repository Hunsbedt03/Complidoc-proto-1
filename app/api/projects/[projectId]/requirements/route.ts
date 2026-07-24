import { NextResponse } from 'next/server';
import { assertSupplierCanAccessProject } from '@/lib/customer-portal/supplierAccess';
import { getCatalogDocument } from '@/lib/documents/catalog';
import type { DocumentId } from '@/lib/documents/ids';
import { requirementDocumentOptions } from '@/lib/requirements/labels';
import {
  loadPendingSuggestions,
  loadProjectChecklist,
} from '@/lib/requirements/server';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const allowed = await assertSupplierCanAccessProject(user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const [checklist, suggestions] = await Promise.all([
      loadProjectChecklist(supabase, projectId),
      loadPendingSuggestions(supabase, projectId),
    ]);

    return NextResponse.json({
      checklist,
      suggestions,
      documentOptions: requirementDocumentOptions(),
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const allowed = await assertSupplierCanAccessProject(user.id, projectId);
    if (!allowed) {
      return NextResponse.json({ error: 'Ingen tilgang' }, { status: 403 });
    }

    const body = (await request.json()) as {
      documentId?: string;
      begrunnelse?: string;
    };
    const documentId = body.documentId?.trim();
    if (!documentId) {
      return NextResponse.json({ error: 'Mangler dokumenttype' }, { status: 400 });
    }
    if (!getCatalogDocument(documentId as DocumentId)) {
      return NextResponse.json({ error: 'Ukjent dokumenttype' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('supplier_project_requirements')
      .upsert(
        {
          project_id: projectId,
          document_id: documentId,
          begrunnelse: body.begrunnelse?.trim() || null,
          created_by: user.id,
        },
        { onConflict: 'project_id,document_id' }
      )
      .select('id, project_id, document_id, begrunnelse')
      .single();

    if (error) throw error;
    return NextResponse.json({ requirement: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
