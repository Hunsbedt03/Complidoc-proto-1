'use client';

import { useEffect, useState } from 'react';
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
import { getCatalogDocument } from '@/lib/documents/catalog';
import { getDefaultSelectedDocuments } from '@/lib/documents/registry';
import { isArchiveEligibleId } from '@/lib/archive/eligible';
import { resolveArchiveLinksAfterSave } from '@/lib/archive/mapSaveResponse';
import type { AutoLinkResult } from '@/lib/archive/types';
import { getLocalCompanyId } from '@/lib/localArchive';
import { deriveRequirements } from '@/lib/documents/requirements';
import { projectInputFromForm } from '@/lib/projectInput';
import { projectDefaultsFromProfile } from '@/lib/companyProfile/extended';
import type { CompanyProfile, ProjectFormData } from '@/lib/types';
import { DocumentChecklist } from '@/components/DocumentChecklist';
import { usePermissions } from '@/hooks/usePermissions';
import { PROJECT_ACTIVITY_ID } from '@/lib/revisions';
import { saveDocumentRevision } from '@/lib/revisions/saveRevision';
import { CertificationMultiSelect } from '@/components/ui/CertificationMultiSelect';
import type { ISOCertification } from '@/lib/documents/types';

export function ProjectForm() {
  const router = useRouter();
  const { user, profile, bedriftId, refreshProjects } = useAuth();
  const permissions = usePermissions();
  const { setResult, syncProjectId, setArchiveLinks } = useGeneration();

  const [form, setForm] = useState<ProjectFormData>({
    ...EMPTY_FORM,
    certifications: [],
    addedDocuments: [],
  });
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentId[]>(() =>
    getDefaultSelectedDocuments()
  );
  useEffect(() => {
    if (!user) return;
    void fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { profile?: CompanyProfile | null } | null) => {
        const cp = json?.profile;
        if (!cp) return;
        const defaults = projectDefaultsFromProfile(cp);
        setForm((prev) => ({
          ...prev,
          produsent: prev.produsent || defaults.produsent,
          ingenior:
            prev.ingenior ||
            defaults.ingenior ||
            profile?.full_name ||
            '',
          marked: prev.marked || defaults.marked,
          installasjonsmiljo:
            prev.installasjonsmiljo || defaults.installasjonsmiljo,
          standarder: prev.standarder || defaults.standarder,
          certifications:
            prev.certifications?.length
              ? prev.certifications
              : defaults.certifications,
        }));
      });
  }, [user, profile?.full_name]);

  const [loading, setLoading] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
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
    if (!permissions.createProject) {
      setGenerateError('Du har ikke tilgang til å opprette nye prosjekter.');
      return;
    }
    setGenerateError(null);
    setLoading(true);
    try {
      const formWithDocs: ProjectFormData = {
        ...form,
        selectedDocuments,
        certifications: form.certifications ?? [],
        addedDocuments: form.addedDocuments ?? [],
      };
      const result = await generateDocumentPackage(formWithDocs, (p) =>
        setProgress({
          stepIndex: p.stepIndex,
          label: p.label,
          stepText: p.stepText,
          total: p.total,
        })
      );

      const localProjectId = setResult(
        result.zipData,
        result.title,
        formWithDocs,
        result.documents
      );

      const creatorName =
        formWithDocs.ingenior || profile?.full_name || user?.email || 'Bruker';
      if (result.failedLabels.length > 0) {
        console.warn('[samsiq] Delvis generering:', result.failedLabels);
        setGenerateError(
          'Dokumentpakke delvis generert. Følgende feilet: ' +
            result.failedLabels.slice(0, 6).join(', ') +
            (result.failedLabels.length > 6
              ? ` … og ${result.failedLabels.length - 6} til`
              : '')
        );
      }

      const selectedHybrid = selectedDocuments.filter(
        (id) => getCatalogDocument(id)?.sourceType === 'hybrid'
      );
      const savePayload = {
        ...formWithDocs,
        machineData: result.machineData,
        zipFilename: result.zipData.filename,
        zipBase64: result.zipData.zip,
        documents: result.documents,
        selectedHybrid,
        uploads: [],
        workflowStatus: 'draft' as const,
        localProjectId,
      };

      const supabase = createClient();
      const {
        data: { user: saveUser },
      } = await supabase.auth.getUser();

      function localArchivePayload(pid: string) {
        const input = projectInputFromForm(formWithDocs);
        const eligibleTypeIds = deriveRequirements(
          input,
          formWithDocs.selectedDocuments ?? [],
          selectedHybrid
        )
          .filter((d) => isArchiveEligibleId(d.id))
          .map((d) => d.id);
        return {
          localArchiveEligibleIds: eligibleTypeIds,
          localCompanyId: getLocalCompanyId(saveUser?.id ?? pid),
        };
      }

      async function applyArchiveLinks(
        pid: string,
        saveJson?: {
          archiveLinks?: AutoLinkResult[];
          localArchiveEligibleIds?: string[];
          localCompanyId?: string;
        }
      ) {
        const links = resolveArchiveLinksAfterSave(pid, {
          ...localArchivePayload(pid),
          ...saveJson,
        });
        if (links.length) setArchiveLinks(links);
        return links;
      }

      async function persistLocal(extra?: Record<string, unknown>) {
        const localId = saveProjectLocally(savePayload);
        const links = await applyArchiveLinks(localId);
        saveProjectLocally({ ...savePayload, localProjectId: localId, archiveLinks: links });
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
            archiveLinks?: AutoLinkResult[];
            localArchiveEligibleIds?: string[];
            localCompanyId?: string;
          }>(saveRes);
          if (!saveRes.ok) {
            const apiErr = formatApiError(saveJson.error) || 'Lagring feilet';
            const err = new Error(apiErr);
            (err as Error & { setupRequired?: boolean }).setupRequired =
              saveJson.setupRequired === true || saveRes.status === 503;
            throw err;
          }
          if (!saveJson.projectId) {
            throw new Error('Sky-lagring returnerte ikke projectId');
          }
          syncProjectId(saveJson.projectId);
          const links = resolveArchiveLinksAfterSave(saveJson.projectId, saveJson);
          saveProjectLocally({
            ...savePayload,
            localProjectId: saveJson.projectId,
            archiveLinks: links,
          });
          setArchiveLinks(links);
          if (saveJson.partialDocumentSave && saveJson.skippedDocumentTypes?.length) {
            console.warn(
              '[samsiq] Delvis DB-lagring — full pakke i ZIP:',
              saveJson.skippedDocumentTypes
            );
          }
          try {
            await saveDocumentRevision({
              projectId: saveJson.projectId,
              documentId: PROJECT_ACTIVITY_ID,
              content: formWithDocs.prosjekt,
              contentJson: '',
              changeType: 'project_created',
              changeNote: 'Prosjekt opprettet',
              changedByName: creatorName,
              source: 'user_edited',
              changedBy: user?.id ?? 'user',
            });
          } catch (revErr) {
            console.warn('[samsiq] project_created revision:', revErr);
          }
          await refreshProjects();
        } catch (saveErr) {
          const errMsg = formatSupabaseError(saveErr);
          const setupFlag =
            (saveErr as { setupRequired?: boolean }).setupRequired === true;
          const errFields = supabaseErrorFields(saveErr);
          const useFallback = setupFlag || isSupabaseSetupError(errMsg);
          if (useFallback) {
            await persistLocal({ errMsg, ...errFields });
          } else {
            throw saveErr;
          }
        }
      }

      router.push('/app/output');
    } catch (err) {
      setGenerateError(
        err instanceof Error
          ? formatSupabaseError(err)
          : formatSupabaseError(err) || 'Generering feilet'
      );
    } finally {
      setLoading(false);
    }
  }

  if (!permissions.loading && !permissions.createProject) {
    return (
      <div className="form-card">
        <p className="form-info">
          Du har lesetilgang og kan ikke opprette nye prosjekter. Kontakt en admin i
          bedriften for utvidet tilgang.
        </p>
        <Link href="/app/dashboard" className="btn-dl">
          Tilbake til oversikt
        </Link>
      </div>
    );
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
        <div className="form-row full">
          <CertificationMultiSelect
            value={form.certifications ?? []}
            onChange={(certifications: ISOCertification[]) =>
              setForm((prev) => ({ ...prev, certifications }))
            }
          />
        </div>
      </div>

      <div className="form-card">
        <div className="form-card-title">Dokumentpakke</div>
        <p className="form-card-hint">
          Velg AI-dokumenter og maler. Opplastinger gjøres i prosjektoversikten etter
          generering.
        </p>
        <DocumentChecklist
          form={form}
          selected={selectedDocuments}
          onChange={setSelectedDocuments}
        />
      </div>

      <div className="form-bottom">
        {generateError ? <p className="form-error">{generateError}</p> : null}
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
