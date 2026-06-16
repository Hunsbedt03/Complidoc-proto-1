import { NextResponse } from 'next/server';
import { getSupplierRevisionState } from '@/lib/customer-portal/revisionCycles';
import { assertSupplierCanAccessProject } from '@/lib/customer-portal/supplierAccess';
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

    const state = await getSupplierRevisionState(projectId);
    return NextResponse.json(state);
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
