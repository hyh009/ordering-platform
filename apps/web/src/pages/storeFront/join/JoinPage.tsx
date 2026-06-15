import { useAppTranslation } from '@/app/i18n';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
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

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="guest-nickname">
          {tDefault('guest.join.nicknameLabel', 'Your name (optional)')}
        </label>
        <Input
          id="guest-nickname"
          value={vm.displayName}
          maxLength={50}
          placeholder={tDefault('guest.join.nicknamePlaceholder', 'e.g. Amy')}
          onChange={(event) => vm.setDisplayName(event.target.value)}
        />
      </div>

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
