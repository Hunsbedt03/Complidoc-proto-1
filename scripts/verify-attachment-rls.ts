/**
 * Verifiserer at customer_can_access_project + visible_to_customer RLS-logikk
 * holder for skjulte leverandørvedlegg.
 *
 * Kjør: npx tsx scripts/verify-attachment-rls.ts
 *
 * For ekte API-test med to brukere:
 * 1. Leverandør laster opp fil A (synlig=false) og fil B (synlig=true)
 * 2. GET /api/projects/{id}/attachments som kunde → skal kun inneholde B + egne
 * 3. GET /api/projects/{id}/attachments/{idA}/download som kunde → 404
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = process.env.ATTACHMENT_RLS_TEST_PROJECT_ID;

async function main() {
  if (!url || !serviceKey) {
    console.log('SKIP: mangler NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY');
    process.exit(0);
  }
  if (!projectId) {
    console.log('SKIP: sett ATTACHMENT_RLS_TEST_PROJECT_ID for live RLS-sjekk');
    console.log('Policy-logikk (customer SELECT):');
    console.log('  customer_can_access_project(project_id)');
    console.log('  AND (visible_to_customer = true OR uploaded_by = auth.uid())');
    process.exit(0);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: allRows, error } = await admin
    .from('project_attachments')
    .select('id, file_name, uploader_role, visible_to_customer, uploaded_by')
    .eq('project_id', projectId);

  if (error) {
    console.error('Feil:', error.message);
    process.exit(1);
  }

  const hiddenSupplier = (allRows ?? []).filter(
    (r) => r.uploader_role === 'supplier' && !r.visible_to_customer
  );
  const sharedSupplier = (allRows ?? []).filter(
    (r) => r.uploader_role === 'supplier' && r.visible_to_customer
  );

  console.log('project_attachments RLS sanity');
  console.log(`  project: ${projectId}`);
  console.log(`  totalt (admin): ${allRows?.length ?? 0}`);
  console.log(`  skjulte leverandørvedlegg: ${hiddenSupplier.length}`);
  console.log(`  delte leverandørvedlegg: ${sharedSupplier.length}`);
  console.log('');
  console.log('Manuell API-test (kunde-session):');
  console.log('  GET /api/projects/' + projectId + '/attachments');
  console.log('  → skal IKKE inkludere:', hiddenSupplier.map((r) => r.file_name).join(', ') || '(ingen)');
  if (hiddenSupplier[0]) {
    console.log(
      '  GET /api/projects/' +
        projectId +
        '/attachments/' +
        hiddenSupplier[0].id +
        '/download → forvent 404'
    );
  }
  console.log('');
  console.log('OK — kjør API-kallene over som innlogget kunde for full RLS-bekreftelse.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
