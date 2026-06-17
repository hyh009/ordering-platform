import { useAppTranslation } from '@/app/i18n';
import { Button } from '@/shared/components/ui/button';

type MenuStatusBannerProps =
  | { mode: 'adding'; orderNumber: string }
  | { mode: 'invite'; onInvite: () => void };

/**
 * Storefront menu status banner. Shows the live pay-later add-on order when one
 * exists, otherwise prompts dine-in group guests to invite friends. Both states
 * use the storefront primary (brand) tint.
 */
export function MenuStatusBanner(props: MenuStatusBannerProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-storefront-primary/40 bg-storefront-primary/15 px-4 py-3">
      {props.mode === 'adding' ? (
        <>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-storefront-text">
              {tDefault('guest.menu.addingToOrder', 'Adding to your order')}
            </span>
            <span className="text-xs text-storefront-text-muted">
              {tDefault('guest.menu.payLaterBadge', 'Pay Later')}
            </span>
          </div>
          <span className="font-mono text-lg font-bold text-storefront-text">
            #{props.orderNumber}
          </span>
        </>
      ) : (
        <>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-storefront-text">
              {tDefault('guest.menu.inviteTitle', 'Invite friends to order')}
            </span>
            <span className="text-xs text-storefront-text-muted">
              {tDefault(
                'guest.menu.inviteSubtitle',
                'Share the Join Code to order together',
              )}
            </span>
          </div>
          <Button size="sm" variant="storefront" onClick={props.onInvite}>
            {tDefault('guest.menu.invite', 'Invite')}
          </Button>
        </>
      )}
    </div>
  );
}
