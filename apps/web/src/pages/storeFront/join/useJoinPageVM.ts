import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useStore } from 'zustand';
import { PATHS } from '@/app/routing/paths';
import {
  toParticipantIdentitySubmission,
  useParticipantIdentityForm,
} from '@/features/storeFront/components/ParticipantIdentitySelector';
import { getStoreFrontRuntime } from '@/features/storeFront/runtime';
import { useStoreFrontStoreId } from '../useStoreFrontStoreId';
import { handleStoreFrontFailure } from '../storeFrontFailureFeedback';
import { createJoinPageCommands } from './joinPage.commands';

export function useJoinPageVM() {
  const storeId = useStoreFrontStoreId();
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const runtime = getStoreFrontRuntime();
  const commands = useMemo(() => createJoinPageCommands(runtime), [runtime]);

  const activeStoreId = useStore(
    runtime.stores.tenant,
    (state) => state.activeStoreId,
  );
  const isActiveStore = activeStoreId === storeId;
  const rawIsMutating = useStore(
    runtime.stores.cart,
    (state) => state.isMutating,
  );
  const isMutating = isActiveStore && rawIsMutating;

  const { values: identityValues, setValue: setIdentityValues } =
    useParticipantIdentityForm();
  // Form-level submit error (e.g. an invalid invite). Lives on this page next
  // to the form rather than as a transient toast.
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    void commands.initialize(storeId);
  }, [commands, storeId]);

  const rawStore = useStore(runtime.stores.storefront, (state) => state.store);
  const store = isActiveStore ? rawStore : null;

  const join = useCallback(async () => {
    if (!joinCode) return;
    setSubmitError(null);

    const result = await commands.join(storeId, {
      joinCode,
      ...toParticipantIdentitySubmission(identityValues),
    });

    if (result.status === 'joined') {
      if (result.target === 'order') {
        if (result.orderId) {
          void navigate(PATHS.STOREFRONT.ORDER_BUILD(storeId, result.orderId));
          return;
        }
      }
      void navigate(PATHS.STOREFRONT.MENU_BUILD(storeId));
      return;
    }

    // One entry point: invalid-join-code lands inline on the form, everything
    // else (network/server/...) follows the shared presentation convention.
    handleStoreFrontFailure(result, { form: { setSubmitError } });
  }, [commands, identityValues, joinCode, navigate, storeId]);

  return {
    store,
    joinCode,
    identityValues,
    setIdentityValues,
    isMutating,
    submitError,
    join,
  };
}
