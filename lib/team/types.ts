import type { TeamRole } from '@/lib/auth/permissions';

export type TeamMemberStatus = 'pending' | 'active' | 'deactivated';

export type TeamInvitationStatus = 'pending' | 'accepted' | 'expired';

export type TeamMember = {
  id: string;
  companyId: string;
  userId: string;
  role: TeamRole;
  status: TeamMemberStatus;
  fullName: string | null;
  email: string;
  invitedAt?: string;
  acceptedAt?: string;
  lastActiveAt?: string;
};

export type TeamInvitation = {
  id: string;
  companyId: string;
  email: string;
  role: TeamRole;
  token: string;
  status: TeamInvitationStatus;
  createdAt: string;
  expiresAt: string;
  invitedByName?: string;
};

export type TeamInvitationPreview = {
  companyName: string;
  role: TeamRole;
  inviterName: string;
  expiresAt: string;
  email: string;
};
