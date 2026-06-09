import { NextResponse } from 'next/server';
import { syncProjectArchiveLinks } from '@/lib/archive/syncLinks';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@/lib/supabaseError';
import type { ProjectFormData } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget', links: [] }, { status: 401 });
    }

    const body = (await request.json()) as {
      projectId?: string;
      form?: ProjectFormData;
    };

    if (!body.projectId || !body.form) {
      return NextResponse.json({ error: 'Mangler projectId eller form' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { links, debug } = await syncProjectArchiveLinks(
      supabase,
      user.id,
      body.projectId,
      body.form,
      { admin }
    );

    return NextResponse.json({ links, debug });
  } catch (err) {
    const msg = formatSupabaseError(err);
    if (msg.includes('company_archive') || msg.includes('42P01')) {
      return NextResponse.json({ links: [], setupRequired: true });
    }
    return NextResponse.json({ error: msg, links: [] }, { status: 500 });
  }
}
