import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertCustomerProjectAccess } from '@/lib/customer-portal/access';
import { fetchCustomerProjectDetail } from '@/lib/customer-portal/projectDetail';
import {
  buildCustomerRevisionBanner,
  customerSignAcceptance,
  fetchProjectRevisionCycles,
} from '@/lib/customer-portal/revisionCycles';
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

    const detail = await fetchCustomerProjectDetail(user.id, projectId);
    return NextResponse.json(detail);
  } catch (err) {
    const msg = formatSupabaseError(err);
    const status = msg.includes('tilgang') ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
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

    const access = await assertCustomerProjectAccess(user.id, projectId);
    const admin = createAdminClient();
    if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY mangler');

    const { data: customerUser } = await admin
      .from('customer_users')
      .select('id, full_name, email')
      .eq('auth_user_id', user.id)
      .in('customer_organization_id', access.organizationIds)
      .limit(1)
      .maybeSingle();

    if (!customerUser) {
      return NextResponse.json({ error: 'Kundebruker ikke funnet' }, { status: 400 });
    }

    const headers = request.headers;
    const metadata = {
      ip: headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
      user_agent: headers.get('user-agent') ?? null,
    };

    await customerSignAcceptance({
      projectId,
      authUserId: user.id,
      customerUserId: customerUser.id,
      customerUserName:
        customerUser.full_name ?? customerUser.email ?? user.email ?? 'Kunde',
      metadata,
    });

    const cycles = await fetchProjectRevisionCycles(projectId);
    const banner = buildCustomerRevisionBanner(cycles, true);

    return NextResponse.json({ ok: true, banner });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
