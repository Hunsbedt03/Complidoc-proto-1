import { NextResponse } from 'next/server';
import { supplierSignAndSend } from '@/lib/customer-portal/revisionCycles';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

type RouteParams = { params: Promise<{ projectId: string }> };

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

    const body = (await request.json().catch(() => ({}))) as { projectName?: string };
    const { data: profile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle();

    const cycle = await supplierSignAndSend({
      projectId,
      userId: user.id,
      userName: profile?.full_name ?? user.email ?? 'Leverandør',
      projectName: body.projectName ?? 'Prosjekt',
    });

    return NextResponse.json({ cycle });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
