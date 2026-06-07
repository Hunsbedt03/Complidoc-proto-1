import { deriveUploadRequirements } from '../lib/documents/uploadRequirements.ts';

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

console.log('pneumatic ids', JSON.stringify({ ids: pneumatic.map((r) => r.id) }));
console.log('electric ids', JSON.stringify({ ids: electric.map((r) => r.id) }));

const pneumaticHasEmc = pneumatic.some((r) => r.id === 'emc_report');
const electricHasEmc = electric.some((r) => r.id === 'emc_report');

console.log('emc only on electric', JSON.stringify({ pneumaticHasEmc, electricHasEmc }));

if (!pneumaticHasEmc && electricHasEmc && pneumatic.some((r) => r.id === 'cad_drawings')) {
  process.exit(0);
}
process.exit(1);
