import JSZip from 'jszip';
import { DOC_STEPS } from './constants';
import type { DocType, GeneratedDoc, ProjectFormData, ZipData } from './types';

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
Beskrivelse: ${form.beskrivelse || 'Ikke spesifisert'}`;
}

export function validateForm(form: ProjectFormData): string | null {
  if (!form.maskin.trim() || !form.prosjekt.trim() || !form.produsent.trim()) {
    return 'Fyll inn maskinbetegnelse, prosjektnavn og produsent før du genererer.';
  }
  return null;
}

async function postGenerate(machineData: string, docType: DocType): Promise<Response> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    lastRes = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineData, docType }),
    });
    if (lastRes.ok || (lastRes.status !== 500 && lastRes.status !== 529) || attempt === 1) {
      return lastRes;
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  return lastRes!;
}

export type GenerateProgress = {
  stepIndex: number;
  label: string;
  stepText: string;
};

export async function generateDocumentPackage(
  form: ProjectFormData,
  onProgress: (p: GenerateProgress) => void
): Promise<{ zipData: ZipData; documents: GeneratedDoc[]; machineData: string; title: string }> {
  const validationError = validateForm(form);
  if (validationError) throw new Error(validationError);

  const machineData = buildMachineData(form);
  const safeSerial = (form.serienr || form.maskin).replace(/[^a-zA-Z0-9]/g, '_');
  const zipFolderName = 'Samsiq_' + safeSerial;
  const zip = new JSZip();
  const folder = zip.folder(zipFolderName)!;
  const zipFilename =
    'Samsiq_' + form.maskin.replace(/[^a-zA-Z0-9]/g, '_') + '_' + safeSerial + '.zip';
  const generatedDocs: GeneratedDoc[] = [];

  for (let i = 0; i < DOC_STEPS.length; i++) {
    const step = DOC_STEPS[i];
    onProgress({
      stepIndex: i,
      label: step.label,
      stepText: 'Dokument ' + (i + 1) + ' av 4',
    });

    const res = await postGenerate(machineData, step.docType);

    if (!res.ok) {
      const txt = await res.text();
      let errMsg = txt;
      try {
        const j = JSON.parse(txt);
        if (j.error) errMsg = j.error;
      } catch {
        /* ignore */
      }
      if (res.status === 504) {
        throw new Error('Timeout ved ' + step.docType + '. Prøv igjen om litt.');
      }
      throw new Error('Feil (' + res.status + ') for ' + step.docType + ': ' + errMsg.slice(0, 300));
    }

    const text = await res.text();
    let data: { error?: string; docx?: string; filename?: string } = {};
    if (text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Ugyldig svar for ' + step.docType + ': ' + text.slice(0, 200));
      }
    }
    if (data.error) throw new Error('Feil ved ' + step.docType + ': ' + data.error);
    if (!data.docx || !data.filename) throw new Error('Uventet svar for ' + step.docType);

    const bytes = atob(data.docx);
    const arr = new Uint8Array(bytes.length);
    for (let b = 0; b < bytes.length; b++) arr[b] = bytes.charCodeAt(b);
    folder.file(data.filename, arr);
    generatedDocs.push({ docType: step.docType, filename: data.filename, docx: data.docx });
  }

  onProgress({ stepIndex: -1, label: 'Pakker ZIP...', stepText: '' });

  const zipB64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE' });

  return {
    zipData: { zip: zipB64, filename: zipFilename },
    documents: generatedDocs,
    machineData,
    title: form.maskin + ' · ' + form.prosjekt,
  };
}
