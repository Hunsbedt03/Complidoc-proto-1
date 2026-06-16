import { NextResponse } from 'next/server';
import {
  inviteCustomerToProject,
  listProjectCustomerAccess,
  revokeCustomerAccess,
} from '@/lib/customer-portal/access';
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

    const access = await listProjectCustomerAccess(projectId);
    return NextResponse.json({ access });
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
    if (!user?.email) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as { email?: string; projectName?: string };
    const email = body.email?.trim();
    if (!email) {
      return NextResponse.json({ error: 'Mangler e-post' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const result = await inviteCustomerToProject({
      projectId,
      email,
      invitedBy: user.id,
      inviterName: profile?.full_name ?? user.email,
      projectName: body.projectName ?? 'Prosjekt',
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as { accessId?: string; action?: string };
    if (body.action !== 'revoke' || !body.accessId) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 });
    }

    await revokeCustomerAccess({
      projectId,
      accessId: body.accessId,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
