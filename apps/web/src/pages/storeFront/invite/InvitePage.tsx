import QRCode from 'react-qr-code';
import joinCodeIllustration from '@/assets/storeFront/img_join_code.png';
import { useAppTranslation } from '@/app/i18n';
import { StorefrontErrorView } from '@/features/storeFront/components/StorefrontErrorView';
import { StorefrontLoadingView } from '@/features/storeFront/components/StorefrontLoadingView';
import { StorefrontPageHeader } from '@/features/storeFront/components/StorefrontPageHeader';
import { useLocalizedText } from '@/features/storeFront/components/useLocalizedText';
import { Button } from '@/shared/components/ui/button';
import { useInvitePageVM } from './useInvitePageVM';

export function InvitePage() {
  const vm = useInvitePageVM();
  const { tDefault } = useAppTranslation();
  const localize = useLocalizedText();

  return (
    <div className="flex flex-1 flex-col">
      <StorefrontPageHeader
        sticky
        left={StorefrontPageHeader.Left.Close}
        middle={StorefrontPageHeader.Middle.Title}
        right={StorefrontPageHeader.Right.Logo}
        title={tDefault('guest.invite.title', 'Invite to the order')}
        onBack={vm.goToMenu}
        logoUrl={vm.store?.logoUrl}
        logoAlt={vm.store ? localize(vm.store.displayName) : undefined}
      />

      {vm.error ? (
        <StorefrontErrorView message={vm.error} onRetry={vm.retry} />
      ) : vm.joinCode ? (
        <div className="flex flex-1 flex-col gap-6 p-5">
          <section className="flex flex-col items-center gap-5 rounded-3xl border border-storefront-border bg-white p-6 text-center shadow-sm">
            <img
              alt=""
              className="h-auto w-full max-w-[280px]"
              src={joinCodeIllustration}
            />
            <h2 className="text-xl font-bold text-storefront-text">
              {tDefault('guest.invite.cardTitle', 'Join this order together!')}
            </h2>

            <div className="flex w-full flex-col items-center gap-2">
              <span className="text-sm text-storefront-text-muted">
                {tDefault('guest.invite.codeLabel', 'Join Code')}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-3xl font-bold uppercase tracking-widest text-storefront-text">
                  {vm.joinCode}
                </span>
                <Button size="sm" variant="outline" onClick={vm.copyJoinCode}>
                  {vm.codeCopied
                    ? tDefault('guest.invite.copied', 'Copied!')
                    : tDefault('guest.invite.copyCode', 'Copy')}
                </Button>
              </div>
            </div>

            <div className="rounded-lg bg-white p-2">
              <QRCode size={180} value={vm.inviteLink} />
            </div>
            <p className="text-sm text-storefront-text-muted">
              {tDefault(
                'guest.invite.qrCaption',
                'Scan the QR Code to join the order',
              )}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="font-semibold text-storefront-text">
              {tDefault('guest.invite.shareTitle', 'Share link')}
            </h3>
            <Button variant="storefront" onClick={vm.copyInviteLink}>
              {vm.linkCopied
                ? tDefault('guest.invite.copied', 'Copied!')
                : tDefault('guest.invite.copyLink', 'Copy invite link')}
            </Button>
          </section>
        </div>
      ) : (
        <StorefrontLoadingView />
      )}
    </div>
  );
}
