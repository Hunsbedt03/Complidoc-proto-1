import { wrapPrompt } from './base';
import type { DocumentId } from '@/lib/documents/ids';

const GENERIC_SPECS: Partial<
  Record<DocumentId, { role: string; title: string; structure: string }>
> = {
  technical_file: {
    role: 'Du er senior compliance-ekspert for Maskindirektivet 2006/42/EF Vedlegg VII.',
    title: 'Teknisk konstruksjonsfil',
    structure: `## 1. Produktidentifikasjon
## 2. Generell beskrivelse
## 3. Risikovurdering — referanse
## 4. Konstruksjons- og produksjonsdata
## 5. Direktiver og standarder
## 6. Tegnings- og dokumentliste
## 7. Installasjon og vedlikehold`,
  },
  declaration_of_conformity: {
    role: 'Du er ekspert på CE-merking og EF-samsvarserklæring.',
    title: 'EF-Samsvarserklæring (NO + EN)',
    structure: `## Norsk versjon — EF-Samsvarserklæring
## English version — EC Declaration of Conformity
Inkluder produsent, maskin, serienummer, direktiver og standarder kun ut fra maskindata.`,
  },
  qc_checklist: {
    role: 'Du er kvalitetsingeniør for maskin-CE.',
    title: 'QC-sjekkliste',
    structure: `Kun sjekkpunkter som kan begrunnes ut fra maskindata.
## Prosjektinformasjon
## Relevante kontrollseksjoner (mekanisk, elektrisk, sikkerhet, merking)
## Godkjenning og signatur`,
  },
  function_description: {
    role: 'Du er maskiningeniør.',
    title: 'Funksjonsbeskrivelse og driftsgrenser',
    structure: `## Funksjonsbeskrivelse
## Driftsgrenser og kapasitet
## Grensesnitt mot operatør/miljø`,
  },
  bom: {
    role: 'Du er konstruksjonsingeniør.',
    title: 'Stykkliste (BOM)',
    structure: `## BOM-tabell: Pos | Beskrivelse | Spesifikasjon | Leverandør | CE/standard`,
  },
  calculation_report: {
    role: 'Du er beregningsingeniør (mekanikk).',
    title: 'Beregningsrapport',
    structure: `## Lasttilfeller
## Beregningsgrunnlag
## Resultater og sikkerhetsfaktorer
## Konklusjon`,
  },
  harmonized_standards_matrix: {
    role: 'Du er standard- og direktivekspert.',
    title: 'Harmonisert standardliste med samsvarsmatrise',
    structure: `| Standard | Tittel | Direktiv | Samsvar | Referanse i dokumentasjon |`,
  },
  safety_function_analysis: {
    role: 'Du er funksjonssikkerhetsekspert (EN ISO 13849 / IEC 62061).',
    title: 'Safety function-analyse',
    structure: `## Sikkerhetsfunksjoner
## PL/SIL-vurdering per funksjon
## Arkitektur og verifikasjon`,
  },
  hazard_register: {
    role: 'Du er maskinsikkerhetsekspert.',
    title: 'Fareregister med restrisiko',
    structure: `Tabell: Fare-ID | Fare | Tiltak | Restrisiko | Aksept`,
  },
  emergency_stop_analysis: {
    role: 'Du er elektro- og sikkerhetsingeniør.',
    title: 'Nødstoppanalyse og sikkerhetskretsdiagram',
    structure: `## Krav
## Kretsbeskrivelse
## Verifikasjon`,
  },
  installation_manual: {
    role: 'Du er teknisk forfatter.',
    title: 'Installasjons- og idriftsettelsesmanual',
    structure: `## Forutsetninger
## Transport og løft
## Installasjon
## Idriftsettelse og test`,
  },
  maintenance_manual: {
    role: 'Du er serviceingeniør.',
    title: 'Vedlikeholdsmanual',
    structure: `## Vedlikeholdsintervaller
## Prosedyrer
## Smøremidler og reservedeler`,
  },
  spare_parts_list: {
    role: 'Du er teknisk forfatter.',
    title: 'Reservedelsliste',
    structure: `| Art.nr | Beskrivelse | Intervall | Mengde |`,
  },
  troubleshooting_guide: {
    role: 'Du er serviceingeniør.',
    title: 'Feilsøkingsguide',
    structure: `| Symptom | Mulig årsak | Tiltak |`,
  },
  nameplate_design: {
    role: 'Du er merkingsspesialist for maskiner.',
    title: 'Merkeplatedesign',
    structure: `## CE-merke og plassering
## Produsentdata og serienummer
## Tekniske data på plate`,
  },
  warning_signs_spec: {
    role: 'Du kjenner ISO 11684 og maskinsikkerhetsmerking.',
    title: 'Advarselsskilt og piktogrammer',
    structure: `| Piktogram | Plassering | Tekst NO/EN |`,
  },
  operator_safety_instructions: {
    role: 'Du er HSE-ingeniør.',
    title: 'Sikkerhetsinstruksjoner for operatør',
    structure: `## Generelle regler
## Før drift
## Under drift
## Ved nødstopp`,
  },
  quality_control_plan: {
    role: 'Du er kvalitetsplanlegger.',
    title: 'Kvalitetskontrollplan (ITP)',
    structure: `| Aktivitet | Metode | Akseptkriterium | Ansvar |`,
  },
  fabrication_drawing_list: {
    role: 'Du er dokumentcontroller.',
    title: 'Fabrikasjonstegningsliste',
    structure: `| Tegn.nr | Rev | Tittel | Status |`,
  },
  welding_procedures: {
    role: 'Du er sveisingeniør.',
    title: 'Sveise- og skjøteprosedyrer',
    structure: `## Omfang
## WPS-oversikt
## Kvalifikasjon`,
  },
  ndt_protocol: {
    role: 'Du er NDT-koordinator.',
    title: 'NDT-protokoll',
    structure: `## Metode
## Omfang
## Akseptkriterier`,
  },
  production_traceability_log: {
    role: 'Du er produksjonskoordinator.',
    title: 'Produksjons- og sporingslogg',
    structure: `| Serienr | Komponent | Batch | Dato |`,
  },
  ukca_declaration: {
    role: 'You are a UK market conformity expert.',
    title: 'UKCA Declaration of Conformity',
    structure: `UKCA declaration structure in English with reference to UK regulations.`,
  },
  osha_sdoc: {
    role: 'You are familiar with OSHA supplier declaration requirements.',
    title: "Supplier's Declaration of Conformity (OSHA)",
    structure: `SDoC structure in English.`,
  },
  csa_documentation: {
    role: 'You are familiar with Canadian CSA conformity.',
    title: 'CSA-samsvarsdokumentasjon',
    structure: `## Omfang Canada
## Standarder og erklæringer`,
  },
  rcm_declaration: {
    role: 'You are familiar with RCM for Australia/NZ.',
    title: 'RCM Declaration',
    structure: `RCM declaration in English.`,
  },
  atex_documentation: {
    role: 'Du er ATEX-ekspert (2014/34/EU).',
    title: 'ATEX-dokumentasjon',
    structure: `## Soner og kategorier
## Utstyr og sertifikater
## Vedlikehold i Ex-område`,
  },
  ped_technical_file: {
    role: 'Du er PED-ekspert (2014/68/EU).',
    title: 'PED-teknisk fil',
    structure: `## Trykkutstyr identifikasjon
## Vurdering og dokumentasjon`,
  },
  emc_report: {
    role: 'Du er EMC-ingeniør (2014/30/EU).',
    title: 'EMC-testrapport',
    structure: `## Testomfang
## Resultater
## Konklusjon`,
  },
  low_voltage_checklist: {
    role: 'Du er lavspenningsdirektiv-ekspert (2014/35/EU).',
    title: 'LVD-sjekkliste',
    structure: `Sjekkliste for elektrisk sikkerhet <1000V AC`,
  },
  rohs_declaration: {
    role: 'Du er RoHS-ekspert (2011/65/EU).',
    title: 'RoHS-samsvarserklæring',
    structure: `## Deklarasjon
## Stoffliste / unntak`,
  },
};

export function getGenericPrompt(id: DocumentId): string {
  const spec = GENERIC_SPECS[id];
  if (!spec) {
    return wrapPrompt(
      'Du er teknisk compliance-ekspert for maskiner.',
      id.replace(/_/g, ' '),
      `Struktur tilpasset dokumenttypen "${id}".`
    );
  }
  return wrapPrompt(spec.role, spec.title, spec.structure);
}
