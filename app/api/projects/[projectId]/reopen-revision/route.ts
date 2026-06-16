import { NextResponse } from 'next/server';
import { reopenProjectRevision } from '@/lib/customer-portal/revisionCycles';
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

    const body = (await request.json()) as { reason?: string; projectName?: string };
    const reason = body.reason?.trim();
    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: 'Oppgi en kort årsak til revisjon (minst 3 tegn)' },
        { status: 400 }
      );
    }

    const cycle = await reopenProjectRevision({
      projectId,
      userId: user.id,
      reason,
      projectName: body.projectName ?? 'Prosjekt',
    });

    return NextResponse.json({ cycle });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
