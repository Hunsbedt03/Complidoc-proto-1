import JSZip from 'jszip';
import type { DocumentId } from './documents/ids';
import { CORE_DOCUMENT_IDS } from './documents/ids';
import { getGeneratableIds } from './documents/catalog';
import { getDocumentDefinition, resolveApiDocType } from './documents/registry';
import { getDefaultSelectedDocuments } from './documents/registry';
import { formatApiError } from './parseJsonResponse';
import { appendCompanyContext } from './companyProfile';
import type { CompanyProfile, GeneratedDoc, ProjectFormData, ZipData } from './types';

export async function fetchCompanyProfileClient(): Promise<CompanyProfile | null> {
  try {
    const res = await fetch('/api/company-profile');
    if (!res.ok) return null;
    const json = (await res.json()) as { profile?: CompanyProfile | null };
    return json.profile ?? null;
  } catch {
    return null;
  }
}

export async function buildMachineDataForGeneration(
  form: ProjectFormData,
  companyProfile?: CompanyProfile | null
): Promise<string> {
  const profile = companyProfile ?? (await fetchCompanyProfileClient());
  return appendCompanyContext(buildMachineData(form), profile);
}

export function buildMachineData(form: ProjectFormData): string {
  return `Maskin: ${form.maskin}
Produsent: ${form.produsent}
Serienummer: ${form.serienr || 'Ikke spesifisert'}
Prosjekt/lokasjon: ${form.prosjekt}
Kunde: ${form.kunde || 'Ikke spesifisert'}
Ansvarlig ingeniør: ${form.ingenior || 'Ikke spesifisert'}
Drivsystem: ${form.drivsystem || 'Ikke spesifisert'}
Energikilde: ${form.drivsystem || 'Ikke spesifisert'}
Installasjonsmiljø: ${form.installasjonsmiljo || 'Ikke spesifisert'}
Styring: ${form.styring || 'Ikke spesifisert'}
Tiltenkt bruk: ${form.tiltenktbruk || 'Ikke spesifisert'}
Marked: ${form.marked || 'Ikke spesifisert'}
Relevante standarder: ${form.standarder || 'Ikke spesifisert'}
Beskrivelse: ${form.beskrivelse || 'Ikke spesifisert'}
Sertifiseringer: ${(form.certifications ?? []).filter((c) => c !== 'none').join(', ') || 'Ingen'}
Tilleggsdokumenter: ${(form.addedDocuments ?? []).join(', ') || 'Ingen'}`;
}

export function validateForm(form: ProjectFormData): string | null {
  if (!form.maskin.trim() || !form.prosjekt.trim() || !form.produsent.trim()) {
    return 'Fyll inn maskinbetegnelse, prosjektnavn og produsent før du genererer.';
  }
  return null;
}

function normalizeSelectedDocuments(form: ProjectFormData): DocumentId[] {
  const raw = form.selectedDocuments?.length
    ? form.selectedDocuments
    : getDefaultSelectedDocuments();
  const set = new Set<DocumentId>(CORE_DOCUMENT_IDS);
  for (const id of raw) set.add(id);
  return [...set].sort((a, b) => {
    const oa = getDocumentDefinition(a)?.zipOrder ?? 99;
    const ob = getDocumentDefinition(b)?.zipOrder ?? 99;
    return oa - ob;
  });
}

async function postGenerate(
  machineData: string,
  documentId: DocumentId,
  projectId?: string | null
): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    lastRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineData, docType: documentId, projectId }),
    });
    if (lastRes.ok || (lastRes.status !== 500 && lastRes.status !== 529) || attempt === 1) {
      return lastRes;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  return lastRes!;
}

export async function generateSingleDocument(
  machineData: string,
  documentId: DocumentId,
  projectId?: string | null
): Promise<GeneratedDoc> {
  const def = getDocumentDefinition(documentId);
  const res = await postGenerate(machineData, documentId, projectId);

  if (!res.ok) {
    const txt = await res.text();
    let errMsg = txt;
    try {
      const j = JSON.parse(txt) as { error?: unknown };
      if (j.error) errMsg = formatApiError(j.error) || txt;
    } catch {
      /* ignore */
    }
    if (res.status === 504) {
      throw new Error('Timeout ved ' + documentId + '. Prøv igjen om litt.');
    }
    throw new Error(
      'Feil (' + res.status + ') for ' + documentId + ': ' + errMsg.slice(0, 300)
    );
  }

  const text = await res.text();
  let data: {
    error?: unknown;
    docx?: string;
    filename?: string;
    docType?: string;
    contentHtml?: string;
    contentJson?: string;
    structuredData?: unknown;
    language?: 'no' | 'en';
  } = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Ugyldig svar for ' + documentId + ': ' + text.slice(0, 200));
    }
  }
  if (data.error) {
    throw new Error(
      'Feil ved ' + documentId + ': ' + formatApiError(data.error)
    );
  }
  if (!data.docx || !data.filename) throw new Error('Uventet svar for ' + documentId);

  return {
    documentId,
    docType: data.docType ?? resolveApiDocType(documentId),
    filename: data.filename,
    docx: data.docx,
    label: def?.label,
    contentHtml: data.contentHtml,
    contentJson: data.contentJson,
    structuredData: data.structuredData
      ? JSON.stringify(data.structuredData)
      : undefined,
    language: data.language,
  };
}

export type GenerateProgress = {
  stepIndex: number;
  label: string;
  stepText: string;
  total: number;
};

async function assertPackageAllowed(): Promise<void> {
  try {
    const res = await fetch('/api/subscription/check');
    if (!res.ok) return;
    const json = (await res.json()) as {
      enforced?: boolean;
      allowed?: boolean;
      reason?: string;
    };
    if (json.enforced && json.allowed === false) {
      throw new Error(json.reason ?? 'Dokumentpakke-grense nådd');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('grense')) throw err;
    /* ikke-innlogget eller stripe av — fortsett */
  }
}

async function recordPackageUsage(): Promise<void> {
  try {
    await fetch('/api/subscription/increment', { method: 'POST' });
  } catch {
    /* best-effort */
  }
}

export async function generateDocumentPackage(
  form: ProjectFormData,
  onProgress: (p: GenerateProgress) => void
): Promise<{
  zipData: ZipData;
  documents: GeneratedDoc[];
  machineData: string;
  title: string;
  failedLabels: string[];
}> {
  const validationError = validateForm(form);
  if (validationError) throw new Error(validationError);

  await assertPackageAllowed();

  const machineData = await buildMachineDataForGeneration(form);
  const selected = getGeneratableIds(normalizeSelectedDocuments(form));
  const total = selected.length;
  const safeSerial = (form.serienr || form.maskin).replace(/[^a-zA-Z0-9]/g, '_');
  const zipFolderName = 'Samsiq_' + safeSerial;
  const zip = new JSZip();
  const folder = zip.folder(zipFolderName)!;
  const zipFilename =
    'Samsiq_' + form.maskin.replace(/[^a-zA-Z0-9]/g, '_') + '_' + safeSerial + '.zip';

  let completed = 0;
  onProgress({
    stepIndex: 0,
    label: 'Genererer ' + total + ' dokumenter parallelt...',
    stepText: '0 av ' + total + ' ferdig',
    total,
  });

  const concurrency = 2;
  const results: PromiseSettledResult<GeneratedDoc>[] = [];
  for (let offset = 0; offset < selected.length; offset += concurrency) {
    const batch = selected.slice(offset, offset + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (documentId) => {
        const doc = await generateSingleDocument(machineData, documentId);
        completed += 1;
        onProgress({
          stepIndex: completed,
          label: 'Genererer dokumentpakke...',
          stepText: completed + ' av ' + total + ' ferdig',
          total,
        });
        return doc;
      })
    );
    results.push(...batchResults);
  }

  const generatedDocs: GeneratedDoc[] = [];
  const errors: string[] = [];

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const id = selected[i];
    if (r.status === 'fulfilled') {
      const doc = r.value;
      const bytes = atob(doc.docx);
      const arr = new Uint8Array(bytes.length);
      for (let b = 0; b < bytes.length; b++) arr[b] = bytes.charCodeAt(b);
      folder.file(doc.filename, arr);
      generatedDocs.push(doc);
    } else {
      const msg =
        r.reason instanceof Error ? r.reason.message : String(r.reason);
      errors.push((getDocumentDefinition(id)?.label ?? id) + ': ' + msg);
    }
  }

  if (generatedDocs.length === 0) {
    throw new Error(errors.join('\n') || 'Ingen dokumenter ble generert.');
  }

  if (errors.length > 0) {
    console.warn('[samsiq] Delvis generering:', errors);
  }

  onProgress({ stepIndex: -1, label: 'Pakker ZIP...', stepText: '', total });

  const zipB64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

  const failedLabels = errors;

  await recordPackageUsage();

  return {
    zipData: { zip: zipB64, filename: zipFilename },
    documents: generatedDocs,
    machineData,
    title: form.maskin + ' · ' + form.prosjekt,
    failedLabels,
  };
}
