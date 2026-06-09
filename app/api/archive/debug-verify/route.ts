import { NextResponse } from 'next/server';
import { getCompanyProfileId } from '@/lib/archive/autoLink';
import { QUALITY_MANUAL_TYPE_ID } from '@/lib/archive/syncLinks';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@/lib/supabaseError';

function normalizeTypeId(id: string): string {
  return id.trim().toLowerCase();
}

/** Verifiserer company_archive-rader vs det koden faktisk søker etter. */
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

    const companyProfileId = await getCompanyProfileId(supabase, user.id);
    if (!companyProfileId) {
      return NextResponse.json({
        companyProfileId: null,
        message: 'Ingen company_profiles-rad for bruker',
        codeExpectations: {
          qualityManualDocumentTypeId: QUALITY_MANUAL_TYPE_ID,
          companyIdUsedInAutoLink: null,
        },
      });
    }

    const admin = createAdminClient() ?? supabase;

    const { data: allActive, error: allErr } = await admin
      .from('company_archive')
      .select(
        'id, company_id, document_type_id, label, is_active, file_name, uploaded_at, iso_certifications'
      )
      .eq('company_id', companyProfileId)
      .eq('is_active', true)
      .order('uploaded_at', { ascending: false });

    const { data: qualityManualExact, error: qmErr } = await admin
      .from('company_archive')
      .select('*')
      .eq('company_id', companyProfileId)
      .eq('document_type_id', QUALITY_MANUAL_TYPE_ID)
      .eq('is_active', true);

    const { data: allQmRows } = await admin
      .from('company_archive')
      .select('id, company_id, document_type_id, label, is_active, uploaded_at')
      .eq('is_active', true)
      .ilike('document_type_id', QUALITY_MANUAL_TYPE_ID);

    const qmForProfile =
      allQmRows?.filter((r) => r.company_id === companyProfileId) ?? [];
    const qmOtherCompanies =
      allQmRows?.filter((r) => r.company_id !== companyProfileId) ?? [];

    const typeIdMismatches = (allActive ?? []).filter(
      (r) =>
        normalizeTypeId(r.document_type_id) === QUALITY_MANUAL_TYPE_ID &&
        r.document_type_id !== QUALITY_MANUAL_TYPE_ID
    );

    const diagnosis = {
      hypothesis_a_documentTypeIdMismatch:
        typeIdMismatches.length > 0 ||
        (qmForProfile.length === 0 &&
          (allQmRows ?? []).some(
            (r) =>
              r.company_id === companyProfileId &&
              normalizeTypeId(r.document_type_id) === QUALITY_MANUAL_TYPE_ID &&
              r.document_type_id !== QUALITY_MANUAL_TYPE_ID
          )),
      hypothesis_b_companyIdMismatch:
        qmForProfile.length === 0 && qmOtherCompanies.length > 0,
      qualityManualFoundForProfile: qmForProfile.length > 0,
      qualityManualFoundElsewhere: qmOtherCompanies.length > 0,
    };

    return NextResponse.json({
      companyProfileId,
      userId: user.id,
      codeExpectations: {
        qualityManualDocumentTypeId: QUALITY_MANUAL_TYPE_ID,
        qualityManualLabel: 'Kvalitetshåndbok',
        companyIdUsedInAutoLink: companyProfileId,
        normalizedSearchId: normalizeTypeId(QUALITY_MANUAL_TYPE_ID),
      },
      tableEditorHint:
        'I Supabase Table Editor: åpne company_archive og sammenlign company_id med companyProfileId over, og document_type_id med qualityManualDocumentTypeId over.',
      sqlEquivalent: {
        allActive: `SELECT id, company_id, document_type_id, label, is_active FROM company_archive WHERE company_id = '${companyProfileId}' AND is_active = true`,
        qualityManual: `SELECT * FROM company_archive WHERE company_id = '${companyProfileId}' AND document_type_id = '${QUALITY_MANUAL_TYPE_ID}' AND is_active = true`,
      },
      companyArchiveActiveRows: allActive ?? [],
      qualityManualRowsExactMatch: qualityManualExact ?? [],
      qualityManualRowsForYourProfile: qmForProfile,
      qualityManualRowsOtherCompanies: qmOtherCompanies.map((r) => ({
        id: r.id,
        company_id: r.company_id,
        document_type_id: r.document_type_id,
        note: 'Tilhører annen company_profiles.id — auto-link finner ikke denne',
      })),
      documentTypeIdMismatches: typeIdMismatches.map((r) => ({
        id: r.id,
        stored: r.document_type_id,
        expected: QUALITY_MANUAL_TYPE_ID,
      })),
      diagnosis,
      errors: {
        allActive: allErr?.message ?? null,
        qualityManual: qmErr?.message ?? null,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: formatSupabaseError(err) }, { status: 500 });
  }
}
