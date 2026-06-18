import { useAppTranslation } from '@/app/i18n';
import { ParticipantIdentitySelector } from '@/features/storeFront/components/ParticipantIdentitySelector';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import { Button } from '@/shared/components/ui/button';
import { useJoinPageVM } from './useJoinPageVM';

export function JoinPage() {
  const vm = useJoinPageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <header className="text-center">
        <h1 className="text-xl font-bold">
          {tDefault('guest.join.title', 'Join the order')}
        </h1>
        {vm.store ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {localize(vm.store.displayName)}
          </p>
        ) : null}
      </header>

      {vm.joinCode ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm text-storefront-text-muted">
            {tDefault('guest.join.codeLabel', 'Join Code')}
          </span>
          <span className="font-mono text-lg font-bold uppercase tracking-widest text-storefront-text">
            {vm.joinCode}
          </span>
        </div>
      ) : null}

      <ParticipantIdentitySelector
        disabled={vm.isMutating}
        value={vm.identityValues}
        onChange={vm.setIdentityValues}
      />

      {vm.submitError ? (
        <p
          role="alert"
          className="text-center text-sm font-medium text-destructive"
        >
          {vm.submitError}
        </p>
      ) : null}

      <Button
        disabled={vm.isMutating}
        onClick={() => {
          void vm.join();
        }}
      >
        {tDefault('guest.join.submit', 'Join')}
      </Button>
    </div>
  );
}
