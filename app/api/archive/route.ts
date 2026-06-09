import { NextResponse } from 'next/server';
import { computeArchiveCoverage } from '@/lib/archive/completeness';
import { getCompanyProfileId } from '@/lib/archive/autoLink';
import { mapDbToArchiveDocument } from '@/lib/archive/mappers';
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

    const companyId = await getCompanyProfileId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({
        documents: [],
        coverage: [],
        companyProfileId: null,
        setupRequired: true,
      });
    }

    const { data, error } = await supabase
      .from('company_archive')
      .select('*')
      .eq('company_id', companyId)
      .order('uploaded_at', { ascending: false });

    if (error) {
      const msg = formatSupabaseError(error);
      if (msg.includes('company_archive') || msg.includes('42P01')) {
        return NextResponse.json({
          documents: [],
          coverage: [],
          companyProfileId: companyId,
          setupRequired: true,
        });
      }
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    const documents = (data ?? []).map(mapDbToArchiveDocument);
    return NextResponse.json({
      documents,
      coverage: computeArchiveCoverage(documents),
      companyProfileId: companyId,
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
