'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_OWNER_PERMISSIONS,
  type UserPermissionContext,
} from '@/lib/auth/permissions';
import { useAuth } from '@/components/providers/AuthProvider';

export function usePermissions(): UserPermissionContext & { loading: boolean } {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<UserPermissionContext>(
    DEFAULT_OWNER_PERMISSIONS
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPermissions(DEFAULT_OWNER_PERMISSIONS);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetch('/api/team/permissions')
      .then(async (r) => {
        const json = (await r.json()) as {
          permissions?: UserPermissionContext;
        };
        if (json.permissions) {
          setPermissions({
            ...DEFAULT_OWNER_PERMISSIONS,
            ...json.permissions,
          });
        }
      })
      .catch(() => {
        setPermissions(DEFAULT_OWNER_PERMISSIONS);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { ...permissions, loading };
}
