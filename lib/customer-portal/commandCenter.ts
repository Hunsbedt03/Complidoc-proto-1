import type { SupabaseClient } from '@supabase/supabase-js';

export type CommandCenterRow = {
  project_id: string;
  project_name: string;
  project_status: string;
  project_updated_at: string;
  project_created_at: string;
  supplier_id: string;
  supplier_name: string;
  supplier_logo_url: string | null;
  supplier_website: string | null;
  supplier_city: string | null;
  supplier_country: string | null;
};

export type CommandCenterProject = {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
  createdAt: string;
};

export type CommandCenterSupplierGroup = {
  supplierId: string;
  name: string;
  logoUrl: string | null;
  website: string | null;
  city: string | null;
  country: string | null;
  projectCount: number;
  lastActivity: string;
  projects: CommandCenterProject[];
};

export function mapProjectStatusBadge(status: string): {
  label: string;
  className: string;
} {
  const key = status.trim().toLowerCase();
  if (key === 'locked' || key === 'fullført' || key === 'fully_signed') {
    return { label: 'Godkjent', className: 'badge badge-done' };
  }
  if (key === 'review' || key === 'pågår') {
    return { label: 'Til gjennomgang', className: 'badge badge-review' };
  }
  if (key === 'draft' || key === 'utkast') {
    return { label: 'Under arbeid', className: 'badge badge-draft' };
  }
  return { label: status || 'Ukjent', className: 'badge badge-draft' };
}

export function formatLocation(city: string | null, country: string | null): string | null {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

export function groupCommandCenterRows(
  rows: CommandCenterRow[]
): CommandCenterSupplierGroup[] {
  const bySupplier = new Map<string, CommandCenterSupplierGroup>();

  for (const row of rows) {
    let group = bySupplier.get(row.supplier_id);
    if (!group) {
      group = {
        supplierId: row.supplier_id,
        name: row.supplier_name,
        logoUrl: row.supplier_logo_url,
        website: row.supplier_website,
        city: row.supplier_city,
        country: row.supplier_country,
        projectCount: 0,
        lastActivity: row.project_updated_at,
        projects: [],
      };
      bySupplier.set(row.supplier_id, group);
    }

    group.projects.push({
      id: row.project_id,
      name: row.project_name,
      status: row.project_status,
      updatedAt: row.project_updated_at,
      createdAt: row.project_created_at,
    });

    if (
      new Date(row.project_updated_at).getTime() >
      new Date(group.lastActivity).getTime()
    ) {
      group.lastActivity = row.project_updated_at;
    }
  }

  for (const group of bySupplier.values()) {
    group.projectCount = group.projects.length;
    group.projects.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  return [...bySupplier.values()].sort(
    (a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );
}

export async function fetchCommandCenter(
  supabase: SupabaseClient,
  authUserId: string
): Promise<{ organizationName: string; suppliers: CommandCenterSupplierGroup[] }> {
  const { data: membership, error: memberErr } = await supabase
    .from('customer_users')
    .select('customer_organizations(name)')
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle();

  if (memberErr) throw memberErr;

  const orgRaw = membership?.customer_organizations as
    | { name: string }
    | { name: string }[]
    | null
    | undefined;
  const organizationName = Array.isArray(orgRaw)
    ? orgRaw[0]?.name ?? 'Kunde'
    : orgRaw?.name ?? 'Kunde';

  const { data: rows, error: rowsErr } = await supabase
    .from('command_center_projects')
    .select(
      'project_id, project_name, project_status, project_updated_at, project_created_at, supplier_id, supplier_name, supplier_logo_url, supplier_website, supplier_city, supplier_country'
    )
    .order('project_updated_at', { ascending: false });

  if (rowsErr) throw rowsErr;

  return {
    organizationName,
    suppliers: groupCommandCenterRows((rows ?? []) as CommandCenterRow[]),
  };
}
