import type { CustomerProjectStatus } from '@/lib/customer-portal/projectStatus';

export type CustomerDashboardProject = {
  id: string;
  name: string;
  supplierName: string;
  produsent: string | null;
  updatedAt: string;
  status: CustomerProjectStatus;
  unreadNotifications: number;
};
