import type {
  ChecklistRequirementItem,
  CustomerRequirementTemplate,
  DocumentOption,
  PendingSuggestion,
} from '@/lib/requirements/types';

export async function fetchProjectRequirements(projectId: string): Promise<{
  checklist: ChecklistRequirementItem[];
  suggestions: PendingSuggestion[];
  documentOptions: DocumentOption[];
}> {
  const res = await fetch(`/api/projects/${projectId}/requirements`);
  const json = (await res.json()) as {
    checklist?: ChecklistRequirementItem[];
    suggestions?: PendingSuggestion[];
    documentOptions?: DocumentOption[];
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste dokumentkrav');
  return {
    checklist: json.checklist ?? [],
    suggestions: json.suggestions ?? [],
    documentOptions: json.documentOptions ?? [],
  };
}

export async function addSupplierRequirement(
  projectId: string,
  input: { documentId: string; begrunnelse?: string }
): Promise<void> {
  const res = await fetch(`/api/projects/${projectId}/requirements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentId: input.documentId,
      begrunnelse: input.begrunnelse,
    }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Kunne ikke legge til krav');
}

export async function reviewRequirementSuggestion(
  projectId: string,
  suggestionId: string,
  status: 'godkjent' | 'avvist'
): Promise<void> {
  const res = await fetch(
    `/api/projects/${projectId}/requirement-suggestions/${suggestionId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }
  );
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Kunne ikke oppdatere forslag');
}

export async function fetchCustomerRequirementTemplates(): Promise<{
  templates: CustomerRequirementTemplate[];
  documentOptions: DocumentOption[];
}> {
  const res = await fetch('/api/customer/requirement-templates');
  const json = (await res.json()) as {
    templates?: CustomerRequirementTemplate[];
    documentOptions?: DocumentOption[];
    error?: string;
  };
  if (!res.ok) throw new Error(json.error ?? 'Kunne ikke laste kravmaler');
  return {
    templates: json.templates ?? [],
    documentOptions: json.documentOptions ?? [],
  };
}

export async function addCustomerRequirementTemplate(input: {
  documentId: string;
  kravBeskrivelse?: string;
}): Promise<void> {
  const res = await fetch('/api/customer/requirement-templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Kunne ikke legge til krav');
}

export async function deactivateCustomerRequirementTemplate(
  id: string
): Promise<void> {
  const res = await fetch('/api/customer/requirement-templates', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, aktiv: false }),
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(json.error ?? 'Kunne ikke fjerne krav');
}
