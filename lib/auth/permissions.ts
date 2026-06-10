import type { PlanId } from '@/lib/plans';

export type TeamRole = 'owner' | 'admin' | 'engineer' | 'viewer';

export type TeamPermissions = {
  invite: boolean;
  remove: boolean;
  editProfile: boolean;
  createProject: boolean;
  editProject: boolean;
  lockProject: boolean;
  manageSubscription: boolean;
};

export const PERMISSIONS: Record<TeamRole, TeamPermissions> = {
  owner: {
    invite: true,
    remove: true,
    editProfile: true,
    createProject: true,
    editProject: true,
    lockProject: true,
    manageSubscription: true,
  },
  admin: {
    invite: true,
    remove: true,
    editProfile: true,
    createProject: true,
    editProject: true,
    lockProject: true,
    manageSubscription: false,
  },
  engineer: {
    invite: false,
    remove: false,
    editProfile: false,
    createProject: true,
    editProject: true,
    lockProject: false,
    manageSubscription: false,
  },
  viewer: {
    invite: false,
    remove: false,
    editProfile: false,
    createProject: false,
    editProject: false,
    lockProject: false,
    manageSubscription: false,
  },
};

export const TEAM_MEMBER_LIMITS: Record<PlanId | 'enterprise', number> = {
  starter: 2,
  pro: 10,
  enterprise: Infinity,
};

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: 'Eier',
  admin: 'Admin',
  engineer: 'Ingeniør',
  viewer: 'Leser',
};

export function permissionsForRole(role: TeamRole): TeamPermissions {
  return PERMISSIONS[role] ?? PERMISSIONS.engineer;
}

export type UserPermissionContext = TeamPermissions & {
  role: TeamRole;
  companyId: string | null;
};

export const DEFAULT_OWNER_PERMISSIONS: UserPermissionContext = {
  role: 'owner',
  companyId: null,
  ...PERMISSIONS.owner,
};
