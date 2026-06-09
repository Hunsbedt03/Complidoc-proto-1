import { NextResponse } from 'next/server';
import { getCompanyProfileId } from '@/lib/archive/autoLink';
import { daysUntilReview } from '@/lib/archive/completeness';
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
      return NextResponse.json({ expiring: [] });
    }

    const companyId = await getCompanyProfileId(supabase, user.id);
    if (!companyId) {
      return NextResponse.json({ expiring: [] });
    }

    const { data, error } = await supabase
      .from('company_archive')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (error) {
      if (formatSupabaseError(error).includes('company_archive')) {
        return NextResponse.json({ expiring: [] });
      }
      return NextResponse.json({ error: formatSupabaseError(error) }, { status: 500 });
    }

    const expiring = (data ?? [])
      .map(mapDbToArchiveDocument)
      .map((doc) => ({ doc, days: daysUntilReview(doc) }))
      .filter((x) => x.days !== null && x.days <= 60)
      .sort((a, b) => (a.days ?? 0) - (b.days ?? 0))
      .map(({ doc, days }) => ({
        id: doc.id,
        label: doc.label,
        documentTypeId: doc.documentTypeId,
        version: doc.version,
        daysRemaining: days,
        isoCertifications: doc.isoCertifications,
      }));

    return NextResponse.json({ expiring });
  } catch {
    return NextResponse.json({ expiring: [] });
  }
}
