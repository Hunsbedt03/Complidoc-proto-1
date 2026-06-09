'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  archiveActiveByType,
  computeArchiveCoverage,
  daysUntilReview,
} from '@/lib/archive/completeness';
import { normalizeArchiveTypeId } from '@/lib/archive/normalize';
import {
  filterArchiveEligibleByProfile,
  getArchiveEligibleDocuments,
  getVisibleArchiveFilterTabs,
} from '@/lib/archive/eligible';
import { profileIsoStandards } from '@/lib/companyProfile/extended';
import type { CompanyProfile } from '@/lib/types';
import { ARCHIVE_CATEGORY_LABELS, ARCHIVE_FILTER_TABS } from '@/lib/archive/types';
import type { ArchiveDocument } from '@/lib/archive/types';
import type { ArchiveCoverageGroup } from '@/lib/archive/completeness';
import {
  ArchiveUploadDialog,
  mergeLocalArchiveList,
} from '@/components/archive/ArchiveUploadDialog';
import { openArchiveDocument } from '@/lib/archive/openDocument';
import { getLocalCompanyId } from '@/lib/localArchive';
import { useAuth } from '@/components/providers/AuthProvider';

function formatDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('nb-NO');
}

export function ArchivePage() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ArchiveDocument[]>([]);
  const [coverage, setCoverage] = useState<ArchiveCoverageGroup[]>([]);
  const [companyProfileId, setCompanyProfileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [presetType, setPresetType] = useState<string | undefined>();
  const [replaceDoc, setReplaceDoc] = useState<ArchiveDocument | undefined>();
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(
    null
  );

  const profileCerts = companyProfile?.certifications ?? [];
  const registeredIso = useMemo(
    () => profileIsoStandards(profileCerts),
    [profileCerts]
  );

  const eligible = useMemo(
    () =>
      filterArchiveEligibleByProfile(
        getArchiveEligibleDocuments(),
        profileCerts
      ),
    [profileCerts]
  );

  const visibleTabs = useMemo(
    () => getVisibleArchiveFilterTabs(profileCerts),
    [profileCerts]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/archive');
      const json = (await res.json()) as {
        documents?: ArchiveDocument[];
        coverage?: ArchiveCoverageGroup[];
        companyProfileId?: string | null;
      };
      const companyId =
        json.companyProfileId ?? (user ? getLocalCompanyId(user.id) : 'local');
      setCompanyProfileId(json.companyProfileId ?? null);
      const merged = mergeLocalArchiveList(companyId, json.documents ?? []);
      setDocuments(merged);
      setCoverage(computeArchiveCoverage(merged, registeredIso));
    } finally {
      setLoading(false);
    }
  }, [user, registeredIso]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetch('/api/company-profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { profile?: CompanyProfile | null } | null) => {
        setCompanyProfile(json?.profile ?? null);
      });
  }, []);

  useEffect(() => {
    if (!visibleTabs.some((t) => t.id === filter)) {
      setFilter('all');
    }
  }, [visibleTabs, filter]);

  const activeByType = useMemo(
    () => archiveActiveByType(documents),
    [documents]
  );

  const filteredEligible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return eligible.filter((d) => {
      if (filter === 'iso_9001' && !d.isoScope?.includes('iso_9001')) return false;
      if (filter === 'iso_14001' && !d.isoScope?.includes('iso_14001')) return false;
      if (filter === 'iso_45001' && !d.isoScope?.includes('iso_45001')) return false;
      if (filter === 'policies' && !d.id.includes('policy')) return false;
      if (filter === 'certifications' && d.category !== 'conformity') return false;
      if (q) {
        return (
          d.label.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          (d.description?.toLowerCase().includes(q) ?? false)
        );
      }
      return true;
    });
  }, [eligible, filter, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, typeof eligible>();
    for (const d of filteredEligible) {
      const key =
        d.isoScope?.includes('iso_9001')
          ? 'quality_management'
          : d.isoScope?.includes('iso_14001')
            ? 'environmental'
            : d.isoScope?.includes('iso_45001')
              ? 'health_safety'
              : 'procedures';
      const list = groups.get(key) ?? [];
      list.push(d);
      groups.set(key, list);
    }
    return [...groups.entries()];
  }, [filteredEligible]);

  function openUpload(typeId?: string, replace?: ArchiveDocument) {
    setPresetType(typeId);
    setReplaceDoc(replace);
    setUploadOpen(true);
  }

  return (
    <div className="archive-page">
      <div className="archive-page-head">
        <div>
          <h2 className="archive-page-title">Bedriftsarkiv</h2>
          <p className="archive-page-sub">
            ISO-prosedyrer og policyer lagres én gang og gjenbrukes i alle prosjekter.
          </p>
        </div>
        <button
          type="button"
          className="btn-generate"
          onClick={() => openUpload()}
        >
          + Last opp dokument
        </button>
      </div>

      {!profileCerts.length ? (
        <p className="archive-info-banner">
          ℹ️ Legg til ISO-sertifiseringer i Innstillinger for å se relevante
          dokumentkrav.
        </p>
      ) : null}

      {coverage.length > 0 ? (
        <section className="archive-coverage">
          <h3 className="archive-section-title">Kompletthetsgrad</h3>
          {coverage.map((group) => (
            <div key={group.certification} className="archive-coverage-row">
              <div className="archive-coverage-head">
                <span>{group.label}</span>
                <span>
                  {group.complete}/{group.total} · {group.percent}%
                </span>
              </div>
              <div className="completeness-category-track">
                <div
                  className="completeness-category-fill"
                  style={{ width: `${group.percent}%` }}
                />
              </div>
              {group.missing.length > 0 ? (
                <p className="archive-coverage-missing">
                  ⚠️ Mangler: {group.missing.slice(0, 3).join(', ')}
                  {group.missing.length > 3
                    ? ` +${group.missing.length - 3} til`
                    : ''}
                </p>
              ) : (
                <p className="archive-coverage-ok">✓ Komplett for {group.label}</p>
              )}
            </div>
          ))}
        </section>
      ) : null}

      <div className="document-search-input-wrap archive-search">
        <span className="document-search-icon">⌕</span>
        <input
          className="document-search-input"
          placeholder="Søk i arkivet…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="archive-filter-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={
              'archive-filter-tab' + (filter === tab.id ? ' archive-filter-tab--active' : '')
            }
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="form-info">Laster arkiv…</p>
      ) : (
        grouped.map(([category, docs]) => {
          const present = docs.filter((d) =>
            activeByType.has(normalizeArchiveTypeId(d.id))
          ).length;
          return (
            <section key={category} className="archive-group">
              <h3 className="archive-group-title">
                {ARCHIVE_CATEGORY_LABELS[category as keyof typeof ARCHIVE_CATEGORY_LABELS] ??
                  category}{' '}
                <span className="archive-group-count">
                  {present}/{docs.length} dokumenter
                </span>
              </h3>
              <ul className="archive-doc-list">
                {docs.map((def) => {
                  const archived = activeByType.get(normalizeArchiveTypeId(def.id));
                  const reviewDays = archived
                    ? daysUntilReview(archived)
                    : null;
                  return (
                    <li key={def.id} className="archive-doc-row">
                      <span className="archive-doc-status">
                        {archived ? '✅' : '⬜'}
                      </span>
                      <div className="archive-doc-info">
                        <p className="archive-doc-label">{def.label}</p>
                        {archived ? (
                          <p className="archive-doc-meta">
                            {archived.version} · Lastet opp{' '}
                            {formatDate(archived.uploadedAt)}
                            {archived.validUntil
                              ? ` · Gjelder til ${formatDate(archived.validUntil)}`
                              : ''}
                            {reviewDays !== null && reviewDays <= 30 ? (
                              <span className="archive-doc-warn">
                                {' '}
                                · ⚠️ Revurder innen {reviewDays} dager
                              </span>
                            ) : null}
                          </p>
                        ) : (
                          <p className="archive-doc-meta archive-doc-meta--empty">
                            Ikke lastet opp
                          </p>
                        )}
                      </div>
                      <div className="archive-doc-actions">
                        {archived ? (
                          <>
                            <button
                              type="button"
                              className="btn-dl"
                              onClick={() =>
                                void openArchiveDocument(
                                  archived.id,
                                  archived.filePath,
                                  archived.mimeType,
                                  archived.fileName,
                                  archived.label
                                )
                              }
                            >
                              Vis
                            </button>
                            <button
                              type="button"
                              className="btn-cancel"
                              onClick={() => openUpload(def.id, archived)}
                            >
                              Ny versjon
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-dl"
                            onClick={() => openUpload(def.id)}
                          >
                            Last opp
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <ArchiveUploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPresetType(undefined);
          setReplaceDoc(undefined);
        }}
        onSaved={() => void load()}
        presetDocumentTypeId={presetType}
        replaceExisting={replaceDoc}
        companyProfileId={companyProfileId}
      />
    </div>
  );
}
