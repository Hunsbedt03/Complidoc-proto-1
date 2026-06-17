import { NextResponse } from 'next/server';
import { fetchCustomerDashboardProjects } from '@/lib/customer-portal/dashboardProjects';
import { formatSupabaseError } from '@/lib/supabaseError';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Ikke innlogget' }, { status: 401 });
    }

    const data = await fetchCustomerDashboardProjects(user.id);
    // #region agent log
    fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'66cbbc'},body:JSON.stringify({sessionId:'66cbbc',location:'customer/projects/route.ts:GET',message:'API response summary',data:{userId:user.id,userEmail:user.email,projectCount:data.projects.length,organizationName:data.organizationName},timestamp:Date.now(),hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
