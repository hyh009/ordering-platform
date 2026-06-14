import { Info, QrCode } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import joinGroupImageUrl from '@/assets/storeFront/join-order-group.png';
import { StorefrontPageHeader } from '@/features/guest/components/StorefrontPageHeader';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useJoinEntryPageVM } from './useJoinEntryPageVM';

export function JoinEntryPage() {
  const vm = useJoinEntryPageVM();
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex flex-1 flex-col bg-storefront-bg">
      <StorefrontPageHeader
        title={tDefault('guest.joinEntry.title', 'Join a shared order')}
        onBack={vm.goBack}
      />

      {/* Illustration */}
      <div className="flex justify-center px-6 py-4">
        <img
          alt=""
          className="w-full max-w-xs"
          src={joinGroupImageUrl}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center px-4 pb-10 md:px-8">
        <div className="w-full max-w-2xl">
          <h2 className="text-xl font-bold text-storefront-text">
            {tDefault('guest.joinEntry.heading', 'Enter Join Code')}
          </h2>
          <p className="mt-1 text-sm text-storefront-text-muted">
            {tDefault(
              'guest.joinEntry.subheading',
              "Enter the Join Code your friend shared to join their order",
            )}
          </p>

          {/* Join Code input */}
          <div className="mt-5 flex flex-col gap-1.5">
            <label
              className="text-sm font-medium text-storefront-text"
              htmlFor="join-code-input"
            >
              {tDefault('guest.joinEntry.codeLabel', 'Join Code')}
            </label>
            <div className="relative">
              <Input
                className="pr-10 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal"
                id="join-code-input"
                maxLength={20}
                placeholder={tDefault('guest.joinEntry.codePlaceholder', 'e.g. A1B2C3')}
                value={vm.joinCode}
                onChange={(e) => vm.setJoinCode(e.target.value)}
              />
              <QrCode className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-storefront-text-muted" />
            </div>
          </div>

          {/* Hint */}
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-storefront-primary/10 px-3 py-2.5">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-storefront-primary" />
            <p className="text-sm text-storefront-text-muted">
              {tDefault(
                'guest.joinEntry.hint',
                'The Join Code is provided by the person who created the order',
              )}
            </p>
          </div>

          {/* Primary action */}
          <Button
            className="mt-6 w-full"
            disabled={!vm.joinCode.trim() || vm.isMutating}
            variant="storefront"
            onClick={() => {
              void vm.join();
            }}
          >
            {tDefault('guest.joinEntry.submit', 'Join order')}
          </Button>

          {/* Divider */}
          <div className="mt-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-storefront-border" />
            <span className="text-sm text-storefront-text-muted">
              {tDefault('common.or', 'or')}
            </span>
            <div className="h-px flex-1 bg-storefront-border" />
          </div>

          {/* Back to home */}
          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={vm.goBack}
          >
            {tDefault('guest.joinEntry.backToHome', 'Back to home')}
          </Button>
        </div>
      </div>
    </div>
  );
}
