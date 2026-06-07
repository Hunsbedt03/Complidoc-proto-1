import { appendFileSync } from 'fs';
import { deriveUploadRequirements } from '../lib/documents/uploadRequirements.ts';

const LOG = 'debug-66cbbc.log';

function log(message, data, hypothesisId) {
  const line = JSON.stringify({
    sessionId: '66cbbc',
    runId: 'verify-upload-req',
    hypothesisId,
    location: 'scripts/verify-upload-requirements.mjs',
    message,
    data,
    timestamp: Date.now(),
  });
  appendFileSync(LOG, line + '\n');
  console.log(message, JSON.stringify(data));
}

const pneumatic = deriveUploadRequirements({
  maskin: 'Manuell presse',
  drivsystem: 'Pneumatisk cylinder',
  styring: 'Manuell',
  installasjonsmiljo: 'Tørr hall',
});

const electric = deriveUploadRequirements({
  maskin: 'Pakkeanlegg',
  drivsystem: '400V AC 3-fase 2.2 kW',
  styring: 'Siemens PLC',
  installasjonsmiljo: 'Industrihall',
});

log('pneumatic ids', { ids: pneumatic.map((r) => r.id) }, 'P4-H1');
log('electric ids', { ids: electric.map((r) => r.id) }, 'P4-H1');

const pneumaticHasEmc = pneumatic.some((r) => r.id === 'emc_report');
const electricHasEmc = electric.some((r) => r.id === 'emc_report');

log('emc only on electric', { pneumaticHasEmc, electricHasEmc }, 'P4-H1');

if (!pneumaticHasEmc && electricHasEmc && pneumatic.some((r) => r.id === 'cad_drawings')) {
  process.exit(0);
}
process.exit(1);
