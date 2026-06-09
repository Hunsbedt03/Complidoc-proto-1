export type DocumentCategory =
  | 'technical_file'
  | 'risk_assessment'
  | 'conformity'
  | 'user_documentation'
  | 'safety_marking'
  | 'production_quality'
  | 'quality_management'
  | 'environmental'
  | 'health_safety'
  | 'product_compliance'
  | 'special_directive'
  | 'market_specific';

export type ISOCertification =
  | 'iso_9001'
  | 'iso_14001'
  | 'iso_45001'
  | 'iso_13485'
  | 'iso_27001'
  | 'iatf_16949'
  | 'as9100'
  | 'none';

export type ConditionalRule =
  | 'hasElectric'
  | 'hasAtex'
  | 'hasPressure'
  | 'hasLifting'
  | 'hasWireless'
  | 'hasDigitalControl'
  | 'hasAI'
  | 'after2027'
  | 'marketUK'
  | 'marketUSA'
  | 'marketCanada'
  | 'marketAustralia'
  | 'marketEurasia'
  | 'marketChina'
  | 'marketBrazil';

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  technical_file: 'Teknisk fil',
  risk_assessment: 'Risikovurdering',
  conformity: 'Samsvar',
  user_documentation: 'Brukerdokumentasjon',
  safety_marking: 'Sikkerhet og merking',
  production_quality: 'Produksjon og kvalitet',
  quality_management: 'ISO 9001',
  environmental: 'ISO 14001',
  health_safety: 'HMS (ISO 45001)',
  product_compliance: 'Produktsamsvar',
  special_directive: 'Spesialdirektiver',
  market_specific: 'Markedsspesifikke',
};

import type { DocumentId } from './ids';
import type { DocumentSourceType } from './source';

export type CatalogDocument = {
  id: DocumentId;
  label: string;
  labelEN?: string;
  category: DocumentCategory;
  sourceType: DocumentSourceType;
  required: boolean;
  directive?: string;
  standard?: string;
  isoScope?: ISOCertification[];
  conditionalOn?: ConditionalRule[];
  description: string;
  reason?: string;
  requiredContent?: string[];
  acceptedFormats?: string[];
  retentionYears?: number;
  zipOrder: number;
  outputFormat: 'docx';
  showWhen?: (input: ProjectContext) => boolean;
};

/** Maskindata + sertifiseringer brukt til å utlede dokumentkrav. */
export type ProjectContext = {
  drivsystem?: string;
  installasjonsmiljo?: string;
  marked?: string;
  styring?: string;
  maskin?: string;
  beskrivelse?: string;
  tiltenktbruk?: string;
  certifications?: ISOCertification[];
  addedDocuments?: DocumentId[];
};

export const ISO_CERTIFICATION_OPTIONS: {
  value: ISOCertification;
  label: string;
}[] = [
  { value: 'iso_9001', label: 'ISO 9001 — Kvalitetsstyring' },
  { value: 'iso_14001', label: 'ISO 14001 — Miljøstyring' },
  { value: 'iso_45001', label: 'ISO 45001 — HMS / Arbeidsmiljø' },
  { value: 'iso_13485', label: 'ISO 13485 — Medisinsk utstyr' },
  { value: 'iso_27001', label: 'ISO 27001 — Informasjonssikkerhet' },
  { value: 'iatf_16949', label: 'IATF 16949 — Bilindustri' },
  { value: 'as9100', label: 'AS9100 — Luftfart' },
  { value: 'none', label: 'Ingen sertifiseringer' },
];
