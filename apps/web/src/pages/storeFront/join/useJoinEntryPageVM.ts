import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { createJoinPageCommands } from './joinPage.commands';

export function useJoinEntryPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createJoinPageCommands(runtime), [runtime]);

  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!storeId) return;
    void commands.initialize(storeId);
  }, [commands, storeId]);

  const goBack = useCallback(() => {
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, storeId]);

  // Manual entry only validates the code shape and hands off to the shared Join
  // confirmation route. Participant identity selection and the Join API call
  // happen there, so manual entry and shared links converge on one flow.
  const submit = useCallback(() => {
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedCode) return;
    void navigate(PATHS.STOREFRONT.JOIN_BUILD(storeId, trimmedCode));
  }, [joinCode, navigate, storeId]);

  return { joinCode, setJoinCode, goBack, submit };
}
