import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@/lib/supabaseError';
import { parseWorkflowStatus, type ProjectStatus } from '@/lib/projectStatus';

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const body = (await request.json()) as {
      projectId?: string;
      workflowStatus?: ProjectStatus;
    };

    if (!body.projectId || !body.workflowStatus) {
      return NextResponse.json({ error: 'Mangler projectId eller workflowStatus' }, {
        status: 400,
      });
    }

    const workflowStatus = parseWorkflowStatus(body.workflowStatus);

    const { error } = await supabase
      .from('prosjekter')
      .update({ workflow_status: workflowStatus })
      .eq('id', body.projectId)
      .eq('user_id', user.id);

    if (error) {
      const msg = formatSupabaseError(error);
      const missingColumn =
        msg.includes('workflow_status') || msg.includes('42703') || msg.includes('PGRST204');
      if (missingColumn) {
        return NextResponse.json(
          {
            error:
              'Database mangler workflow_status — kjør supabase/patch-document-revisions.sql',
            setupRequired: true,
          },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, workflowStatus });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
