import { NextResponse } from 'next/server';
import { assertSupplierCanAccessProject } from '@/lib/customer-portal/supplierAccess';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

type RouteParams = {
  params: Promise<{ projectId: string; id: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { projectId, id } = await params;
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

    const body = (await request.json()) as { status?: string };
    if (body.status !== 'godkjent' && body.status !== 'avvist') {
      return NextResponse.json(
        { error: 'Ugyldig status (bruk godkjent eller avvist)' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('document_requirement_suggestions')
      .update({
        status: body.status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('project_id', projectId)
      .select('id, status, document_id')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Forslag ikke funnet' }, { status: 404 });
    }

    return NextResponse.json({ suggestion: data });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
