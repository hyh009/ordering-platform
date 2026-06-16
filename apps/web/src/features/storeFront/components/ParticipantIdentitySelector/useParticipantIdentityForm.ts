import { useCallback, useState } from 'react';
import {
  createParticipantIdentityValues,
  type ParticipantIdentityValues,
} from './participantIdentity';

export function useParticipantIdentityForm(
  initial?: ParticipantIdentityValues,
) {
  const [values, setValues] = useState<ParticipantIdentityValues>(
    () => initial ?? createParticipantIdentityValues(),
  );

  const setValue = useCallback((value: ParticipantIdentityValues) => {
    setValues(value);
  }, []);

  const reset = useCallback((next?: ParticipantIdentityValues) => {
    setValues(next ?? createParticipantIdentityValues());
  }, []);

  return {
    reset,
    setValue,
    values,
  };
}

export type ParticipantIdentityForm = ReturnType<
  typeof useParticipantIdentityForm
>;
