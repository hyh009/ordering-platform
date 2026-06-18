import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { JOIN_CODE_LENGTH, joinCodeSchema } from '@repo/shared';
import { tDefault } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { createJoinPageCommands } from './joinPage.commands';

export function useJoinEntryPageVM() {
  const storeId = useStoreFrontStoreId();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createJoinPageCommands(runtime), [runtime]);

  const [joinCode, setJoinCodeValue] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    void commands.initialize(storeId);
  }, [commands, storeId]);

  const setJoinCode = useCallback((value: string) => {
    setJoinCodeValue(value);
    setCodeError(null);
  }, []);

  const goBack = useCallback(() => {
    void navigate(PATHS.STOREFRONT.LANDING_BUILD(storeId));
  }, [navigate, storeId]);

  // Manual entry validates the code shape against the shared join code format
  // before handing off to the shared Join confirmation route. Participant
  // identity selection and the Join API call happen there, so manual entry and
  // shared links converge on one flow.
  const submit = useCallback(() => {
    const parsed = joinCodeSchema.safeParse(joinCode);
    if (!parsed.success) {
      setCodeError(
        tDefault(
          'guest.joinEntry.invalidCode',
          'Enter the {{length}}-character join code.',
          { length: JOIN_CODE_LENGTH },
        ),
      );
      return;
    }
    void navigate(PATHS.STOREFRONT.JOIN_BUILD(storeId, parsed.data));
  }, [joinCode, navigate, storeId]);

  return { joinCode, setJoinCode, codeError, goBack, submit };
}
