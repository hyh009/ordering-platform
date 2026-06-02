import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import type { StoreListItem } from '@/models/store';
import { organizationService } from '@/services/organization.service';

export function useStoreListPageVM(organizationId: string) {
  const navigate = useNavigate();
  const [stores, setStores] = useState<StoreListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStores = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await organizationService.listAdminStores(organizationId);
      const sorted = [...result.stores].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setStores(sorted);
    } catch {
      setError('Failed to load stores.');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadStores();
  }, [loadStores]);

  const goToCreate = useCallback(() => {
    void navigate(PATHS.SUPER_ADMIN.STORE_CREATE_BUILD(organizationId));
  }, [navigate, organizationId]);

  return { stores, isLoading, error, goToCreate };
}
