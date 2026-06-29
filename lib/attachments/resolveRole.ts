import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { assertCustomerProjectAccess } from '@/lib/customer-portal/access';
import { assertSupplierCanAccessProject } from '@/lib/customer-portal/supplierAccess';
import type { AttachmentUploaderRole } from '@/lib/attachments/types';

/**
 * Utleder uploader_role på serveren. Leverandør-tilgang prioriteres hvis bruker
 * har begge roller (sjelden, men mulig).
 */
export async function resolveAttachmentUploaderRole(
  userId: string,
  projectId: string
): Promise<AttachmentUploaderRole | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const isSupplier = await assertSupplierCanAccessProject(userId, projectId, admin);
  if (isSupplier) return 'supplier';

  try {
    await assertCustomerProjectAccess(userId, projectId);
    return 'customer';
  } catch {
    return null;
  }
}
