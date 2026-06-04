'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoadingOverlay } from '@/components/ui/LoadingOverlay';
import { useAuth } from '@/components/providers/AuthProvider';
import { useGeneration } from '@/components/providers/GenerationProvider';
import { EMPTY_FORM } from '@/lib/constants';
import { generateDocumentPackage } from '@/lib/generate';
import { saveProjectLocally } from '@/lib/localProjects';
import {
  formatApiError,
  isSupabaseSetupError,
  parseJsonResponse,
} from '@/lib/parseJsonResponse';
import { createClient } from '@/lib/supabase/client';
import { formatSupabaseError, supabaseErrorFields } from '@/lib/supabaseError';
import type { DocumentId } from '@/lib/documents/ids';
import { getDefaultSelectedDocuments } from '@/lib/documents/registry';
import type { ProjectFormData } from '@/lib/types';
import {
  DocumentChecklist,
} from '@/components/DocumentChecklist';

export function ProjectForm() {
  const router = useRouter();
  const { user, bedriftId, refreshProjects } = useAuth();
  const { setResult } = useGeneration();

  const [form, setForm] = useState<ProjectFormData>({ ...EMPTY_FORM });
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentId[]>(() =>
    getDefaultSelectedDocuments()
  );
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    stepIndex: 0,
    label: '',
    stepText: '',
    total: 4,
  });

  function update(field: keyof ProjectFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const formWithDocs: ProjectFormData = {
        ...form,
        selectedDocuments,
      };
      const result = await generateDocumentPackage(formWithDocs, (p) =>
        setProgress({
          stepIndex: p.stepIndex,
          label: p.label,
          stepText: p.stepText,
          total: p.total,
        })
      );

      setResult(result.zipData, result.title, formWithDocs, result.documents);

      if (result.failedLabels.length > 0) {
        console.warn('[samsiq] Delvis generering:', result.failedLabels);
        alert(
          'Dokumentpakke delvis generert.\n\nFølgende feilet:\n' +
            result.failedLabels.slice(0, 6).join('\n') +
            (result.failedLabels.length > 6
              ? '\n… og ' + (result.failedLabels.length - 6) + ' til'
              : '')
        );
      }

      const savePayload = {
        ...formWithDocs,
        machineData: result.machineData,
        zipFilename: result.zipData.filename,
        zipBase64: result.zipData.zip,
        documents: result.documents,
      };

      const supabase = createClient();
      const {
        data: { user: saveUser },
      } = await supabase.auth.getUser();

      async function persistLocal(extra?: Record<string, unknown>) {
        const localId = saveProjectLocally(savePayload);
        try {
          await refreshProjects();
        } catch (refreshErr) {
          console.warn(
            '[samsiq] Lokal lagring OK, dashboard-oppdatering feilet:',
            formatSupabaseError(refreshErr)
          );
        }
        console.warn('[samsiq] Lagret lokalt:', localId, extra ?? '');
        return localId;
      }

      if (!saveUser) {
        await persistLocal();
      } else {
        try {
          const healthRes = await fetch('/api/health/supabase');
          const health = await parseJsonResponse<{ ready?: boolean }>(healthRes);
          if (!health.ready) {
            await persistLocal({ health });
          } else {
          const cloudPayload = {
            ...savePayload,
            zipBase64: '',
          };
          const saveBody = JSON.stringify({
            bedriftId,
            payload: cloudPayload,
          });
          const saveRes = await fetch('/api/projects/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: saveBody,
          });
          const saveJson = await parseJsonResponse<{
            error?: unknown;
            setupRequired?: boolean;
            projectId?: string;
            partialDocumentSave?: boolean;
            skippedDocumentTypes?: string[];
          }>(saveRes);
          if (!saveRes.ok) {
            const apiErr = formatApiError(saveJson.error) || 'Lagring feilet';
            const err = new Error(apiErr);
            (err as Error & { setupRequired?: boolean }).setupRequired =
              saveJson.setupRequired === true || saveRes.status === 503;
            throw err;
          }
          if (saveJson.partialDocumentSave && saveJson.skippedDocumentTypes?.length) {
            console.warn(
              '[samsiq] Delvis DB-lagring — full pakke i ZIP:',
              saveJson.skippedDocumentTypes
            );
          }
          await refreshProjects();
          }
        } catch (saveErr) {
          const errMsg = formatSupabaseError(saveErr);
          // #region agent log
          fetch('http://127.0.0.1:7899/ingest/bef89494-0ce9-4594-b826-2f6c32aab015', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '66cbbc' },
            body: JSON.stringify({
              sessionId: '66cbbc',
              runId: 'post-fix-2',
              hypothesisId: 'H-save',
              location: 'ProjectForm.tsx:handleGenerate',
              message: 'cloud save failed',
              data: { errMsg, docCount: savePayload.documents.length },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
          const setupFlag =
            (saveErr as { setupRequired?: boolean }).setupRequired === true;
          const errFields = supabaseErrorFields(saveErr);
          const useFallback =
            setupFlag || isSupabaseSetupError(errMsg) || !saveUser;
          if (useFallback) {
            await persistLocal({ errMsg, ...errFields });
          } else {
            console.error(
              '[samsiq] Sky-lagring feilet (lagrer lokalt):',
              errFields,
              saveErr
            );
            await persistLocal({ errMsg, ...errFields });
          }
        }
      }

      router.push('/app/output');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Generering feilet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <LoadingOverlay
        active={loading}
        label={progress.label || 'Genererer dokumentpakke...'}
        stepText={progress.stepText}
        stepIndex={progress.stepIndex}
        total={progress.total}
      />

      <div className="step-bar">
        <div className="step curr">
          <div className="step-num">1</div>
          <span className="step-label">Prosjektdetaljer</span>
        </div>
        <div className="step-line" />
        <div className="step wait">
          <div className="step-num">2</div>
          <span className="step-label">Maskinbeskrivelse</span>
        </div>
        <div className="step-line" />
        <div className="step wait">
          <div className="step-num">3</div>
          <span className="step-label">Generer</span>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-title">Prosjektinformasjon</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Prosjektnavn / lokasjon <span className="hint">*</span>
            </label>
            <input
              className="form-input"
              value={form.prosjekt}
              onChange={(e) => update('prosjekt', e.target.value)}
              placeholder="f.eks. Strandafjorden kraftverk"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Kunde / sluttbruker</label>
            <input
              className="form-input"
              value={form.kunde}
              onChange={(e) => update('kunde', e.target.value)}
              placeholder="f.eks. Statkraft AS"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Produsent / bedrift <span className="hint">*</span>
            </label>
            <input
              className="form-input"
              value={form.produsent}
              onChange={(e) => update('produsent', e.target.value)}
              placeholder="f.eks. Foss Solutions AS"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Ansvarlig ingeniør</label>
            <input
              className="form-input"
              value={form.ingenior}
              onChange={(e) => update('ingenior', e.target.value)}
              placeholder="Fullt navn"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Serienummer</label>
            <input
              className="form-input"
              value={form.serienr}
              onChange={(e) => update('serienr', e.target.value)}
              placeholder="f.eks. GEH2000-1158-26"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              Maskinbetegnelse <span className="hint">*</span>
            </label>
            <input
              className="form-input"
              value={form.maskin}
              onChange={(e) => update('maskin', e.target.value)}
              placeholder="f.eks. GEH 2000 Grindrenser"
            />
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-title">Teknisk beskrivelse</div>
        <div className="form-card-hint">
          Skriv så detaljert du kan. AI-en bruker kun det du oppgir — manglende info markeres med
          [MANGLER] i dokumentene.
        </div>
        <div className="form-row full">
          <div className="form-group">
            <label className="form-label">
              Maskinbeskrivelse og funksjon <span className="hint">*</span>
            </label>
            <textarea
              className="form-input"
              rows={4}
              value={form.beskrivelse}
              onChange={(e) => update('beskrivelse', e.target.value)}
              placeholder="Beskriv hva maskinen gjør, hvordan den beveger seg og hva den brukes til."
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Drivsystem og energikilde</label>
            <input
              className="form-input"
              value={form.drivsystem}
              onChange={(e) => update('drivsystem', e.target.value)}
              placeholder="f.eks. Elektromotor 400V AC 3-fase, 2.2 kW"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Styring</label>
            <input
              className="form-input"
              value={form.styring}
              onChange={(e) => update('styring', e.target.value)}
              placeholder="f.eks. PLC automatikk + manuell betjening"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Installasjonsmiljø</label>
            <input
              className="form-input"
              value={form.installasjonsmiljo}
              onChange={(e) => update('installasjonsmiljo', e.target.value)}
              placeholder="f.eks. Utendørs, fuktig miljø"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tiltenkt bruk</label>
            <input
              className="form-input"
              value={form.tiltenktbruk}
              onChange={(e) => update('tiltenktbruk', e.target.value)}
              placeholder="f.eks. Rensing av inntak i vannkraftverk"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">
              Relevante standarder <span className="hint">valgfritt</span>
            </label>
            <input
              className="form-input"
              value={form.standarder}
              onChange={(e) => update('standarder', e.target.value)}
              placeholder="f.eks. EN ISO 12100, EN 60204-1"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Marked</label>
            <input
              className="form-input"
              value={form.marked}
              onChange={(e) => update('marked', e.target.value)}
              placeholder="f.eks. EU / EØS — Norge"
            />
          </div>
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-title">Dokumenter som genereres</div>
        <DocumentChecklist
          form={form}
          selected={selectedDocuments}
          onChange={setSelectedDocuments}
        />
      </div>

      <div className="form-bottom">
        <div>
          <Link href="/app/dashboard" className="btn-cancel">
            Avbryt
          </Link>
          <button
            className="btn-generate"
            type="button"
            id="btn-generate"
            disabled={loading}
            onClick={handleGenerate}
          >
            Generer dokumentpakke →
          </button>
        </div>
      </div>
    </>
  );
}
