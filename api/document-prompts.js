/**
 * Server-side dokumentprompter (speilet fra lib/generators/prompts).
 * Brukes av api/generate.source.js
 */

const MANGLER_REGEL = `
VIKTIG REGEL — [MANGLER]-prinsippet:
- Dersom et felt er "—", tomt, eller ikke oppgitt: skriv [MANGLER: kort beskrivelse av hva som mangler] akkurat der informasjonen ville stått.
- ALDRI spekker, gjett eller finn opp tekniske verdier utover det som er eksplisitt oppgitt i maskindata.
- Dokumentet skal være klart til bruk — [MANGLER]-markørene viser nøyaktig hva ingeniøren må fylle inn.
- Skriv på norsk (bokmål) med faglig presisjon med mindre dokumentet krever engelsk seksjon.`;

const NEUTRALITET = `
NØYTRALITET:
- Baser HELE dokumentet utelukkende på maskindata fra brukeren.
- Ikke anta maskintype, bransje eller bruksområde utover oppgitt informasjon.`;

function wrap(role, title, structure, context) {
  return `${role}

${MANGLER_REGEL}
${NEUTRALITET}

${context}

Generer dokumentet: **${title}**

${structure}

Kun markdown. Ingen JSON. Ingen kodebokser. Bruk ## for hovedoverskrifter og tabeller der det er naturlig.`;
}

const GENERIC_SPECS = {
  function_description: ['maskiningeniør', 'Funksjonsbeskrivelse og driftsgrenser', '## Funksjon\n## Driftsgrenser'],
  bom: ['konstruksjonsingeniør', 'Stykkliste (BOM)', '## BOM-tabell'],
  calculation_report: ['beregningsingeniør', 'Beregningsrapport', '## Lasttilfeller\n## Resultater'],
  harmonized_standards_matrix: ['standardekspert', 'Harmonisert standardliste', '| Standard | Direktiv | Samsvar |'],
  fmea: ['reliability engineer', 'FMEA', '## Komponenter\n## FMEA-tabell med S,O,D,RPN'],
  safety_function_analysis: ['funksjonssikkerhet', 'Safety function-analyse PL/SIL', '## Sikkerhetsfunksjoner\n## PL/SIL'],
  hazard_register: ['maskinsikkerhet', 'Fareregister', 'Tabell: Fare | Tiltak | Restrisiko'],
  emergency_stop_analysis: ['sikkerhetsingeniør', 'Nødstoppanalyse', '## Krav\n## Krets'],
  user_manual_no: ['teknisk forfatter', 'Brukerhåndbok NO', '## Sikkerhet\n## Installasjon\n## Drift\n## Vedlikehold'],
  user_manual_en: ['technical author', 'User manual EN', '## Safety\n## Installation\n## Operation\n## Maintenance'],
  installation_manual: ['forfatter', 'Installasjonsmanual', '## Installasjon\n## Idriftsettelse'],
  maintenance_manual: ['service', 'Vedlikeholdsmanual', '## Intervaller\n## Prosedyrer'],
  spare_parts_list: ['forfatter', 'Reservedelsliste', '| Art.nr | Beskrivelse |'],
  troubleshooting_guide: ['service', 'Feilsøkingsguide', '| Symptom | Årsak | Tiltak |'],
  nameplate_design: ['merking', 'Merkeplatedesign', '## CE-merke\n## Plateinnhold'],
  warning_signs_spec: ['ISO 11684', 'Advarselsskilt', '| Piktogram | Plassering |'],
  operator_safety_instructions: ['HSE', 'Operatør-sikkerhet', '## Før drift\n## Under drift'],
  quality_control_plan: ['kvalitet', 'ITP', '| Aktivitet | Metode | Aksept |'],
  fabrication_drawing_list: ['dokumentkontroll', 'Tegningsliste', '| Tegn.nr | Rev |'],
  welding_procedures: ['sveisingeniør', 'Sveiseprosedyrer', '## WPS'],
  ndt_protocol: ['NDT', 'NDT-protokoll', '## Metode\n## Aksept'],
  production_traceability_log: ['produksjon', 'Sporingslogg', '| Serienr | Batch |'],
  ukca_declaration: ['UK expert', 'UKCA Declaration', 'UKCA structure in English'],
  osha_sdoc: ['OSHA', 'Supplier Declaration', 'SDoC in English'],
  csa_documentation: ['CSA', 'CSA dokumentasjon', '## Canada conformity'],
  rcm_declaration: ['RCM', 'RCM Declaration', 'RCM in English'],
  atex_documentation: ['ATEX', 'ATEX dokumentasjon', '## Soner\n## Utstyr'],
  ped_technical_file: ['PED', 'PED-teknisk fil', '## Trykkutstyr'],
  emc_report: ['EMC', 'EMC-testrapport', '## Tester\n## Konklusjon'],
  low_voltage_checklist: ['LVD', 'LVD-sjekkliste', 'Elektrisk sikkerhet sjekkliste'],
  rohs_declaration: ['RoHS', 'RoHS-erklæring', '## Deklarasjon'],
  test_protocol: ['testleder', 'Testprotokoll', '## Testobjekt\n## Målepunkt\n## Resultat (utfylles)'],
  fat_checklist: ['FAT-leder', 'FAT-protokoll', '## Sjekkliste\n## Aksept/signatur'],
  inspection_report: ['inspektør', 'Inspeksjonsrapport', '## Omfang\n## Funn\n## Konklusjon'],
  noise_vibration_sheet: ['akustikk', 'Støy/vibrasjon', '## Måleoppsett\n## Resultater'],
};

function buildLegacyPrompts(context) {
  return {
    risk: `Du er en senior teknisk compliance-ekspert med kunnskap om Maskindirektivet 2006/42/EC og EN ISO 12100:2010.

${MANGLER_REGEL}
${NEUTRALITET}

${context}

Skriv en komplett risikovurdering basert KUN på informasjonen i maskindata.

Struktur (bruk nøyaktig disse ## overskriftene):

## 1. Omfang og formål
## 2. Maskinbeskrivelse
## 3. Grenser for maskinen
## 4. Fareidentifikasjon og risikovurdering
## 5. Risikoreduksjonstiltak — sammendrag
## 6. Restrisiko og konklusjon
## 7. Revisjonslogg

Kun markdown.`,

    tech: `Du er en senior teknisk compliance-ekspert med kunnskap om Maskindirektivet 2006/42/EC.

${MANGLER_REGEL}
${NEUTRALITET}

${context}

Skriv en komplett teknisk konstruksjonsfil basert KUN på maskindata.

## 1. Produktidentifikasjon
## 2. Teknisk beskrivelse og virkemåte
## 3. Gjeldende direktiver
## 4. Harmoniserte standarder
## 5. Tegningsliste og dokumentoversikt
## 6. Installasjon og driftsforhold
## 7. Vedlikeholdskrav
## 8. Referansedokumenter

Kun markdown.`,

    doc: `Du er en senior teknisk compliance-ekspert med kunnskap om CE-merking og Maskindirektivet 2006/42/EC.

${MANGLER_REGEL}
${NEUTRALITET}

${context}

Skriv EF-samsvarserklæring på NORSK og ENGELSK.

## Norsk versjon — EF-Samsvarserklæring
## English version — EC Declaration of Conformity

Kun markdown.`,

    qc: `Du er en senior teknisk compliance-ekspert og kvalitetsingeniør.

${MANGLER_REGEL}
${NEUTRALITET}

${context}

Skriv QC-sjekkliste basert KUN på maskindata. Kun relevante seksjoner.

Kun markdown.`,
  };
}

function getPrompt(docType, context) {
  const legacy = buildLegacyPrompts(context);
  if (legacy[docType]) return legacy[docType];

  const spec = GENERIC_SPECS[docType];
  if (spec) {
    return wrap(
      `Du er ${spec[0]} for maskindokumentasjon.`,
      spec[1],
      spec[2],
      context
    );
  }

  return wrap(
    'Du er teknisk compliance-ekspert for maskiner.',
    docType.replace(/_/g, ' '),
    'Struktur tilpasset dokumenttypen med ## overskrifter.',
    context
  );
}

const DOC_TITLES = {
  risk: 'Risikovurdering',
  tech: 'Teknisk konstruksjonsfil',
  doc: 'EF-Samsvarserklæring',
  qc: 'QC-Sjekkliste',
  function_description: 'Funksjonsbeskrivelse',
  bom: 'Stykkliste (BOM)',
  calculation_report: 'Beregningsrapport',
  harmonized_standards_matrix: 'Standardliste og samsvarsmatrise',
  fmea: 'FMEA',
  safety_function_analysis: 'Safety function-analyse',
  hazard_register: 'Fareregister',
  emergency_stop_analysis: 'Nødstoppanalyse',
  user_manual_no: 'Brukerhåndbok (NO)',
  user_manual_en: 'User manual (EN)',
  installation_manual: 'Installasjonsmanual',
  maintenance_manual: 'Vedlikeholdsmanual',
  spare_parts_list: 'Reservedelsliste',
  troubleshooting_guide: 'Feilsøkingsguide',
  nameplate_design: 'Merkeplatedesign',
  warning_signs_spec: 'Advarselsskilt',
  operator_safety_instructions: 'Sikkerhetsinstruksjoner operatør',
  quality_control_plan: 'Kvalitetskontrollplan',
  fabrication_drawing_list: 'Tegningsliste',
  welding_procedures: 'Sveiseprosedyrer',
  ndt_protocol: 'NDT-protokoll',
  production_traceability_log: 'Produksjonslogg',
  ukca_declaration: 'UKCA Declaration',
  osha_sdoc: 'OSHA SDoC',
  csa_documentation: 'CSA dokumentasjon',
  rcm_declaration: 'RCM Declaration',
  atex_documentation: 'ATEX dokumentasjon',
  ped_technical_file: 'PED-teknisk fil',
  emc_report: 'EMC-testrapport',
  low_voltage_checklist: 'LVD-sjekkliste',
  rohs_declaration: 'RoHS-erklæring',
  test_protocol: 'Testprotokoll',
  fat_checklist: 'FAT-protokoll',
  inspection_report: 'Inspeksjonsrapport',
  noise_vibration_sheet: 'Støy/vibrasjon',
};

const VALID_DOC_TYPES = [
  'risk', 'tech', 'doc', 'qc',
  ...Object.keys(GENERIC_SPECS),
];

module.exports = { getPrompt, DOC_TITLES, VALID_DOC_TYPES, GENERIC_SPECS };
