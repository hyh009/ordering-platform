import { useAppTranslation } from '@/app/i18n';
import joinCodeImg from '@/assets/storeFront/img_join_code.png';
import { Button } from '@/shared/components/ui/button';

type MenuStatusBannerProps =
  | { mode: 'adding'; orderNumber: string }
  | { mode: 'invite'; joinCode: string; onInvite: () => void };

/**
 * Storefront menu status banner. Shows the live pay-later add-on order when one
 * exists, otherwise prompts dine-in group guests to invite friends. Both states
 * use the storefront primary (brand) tint.
 */
export function MenuStatusBanner(props: MenuStatusBannerProps) {
  const { tDefault } = useAppTranslation();

  if (props.mode === 'adding') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-storefront-primary/40 bg-storefront-primary/15 px-4 py-3">
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
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-between overflow-hidden rounded-xl border border-dashed border-storefront-border px-4 py-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold text-storefront-text">
          {tDefault('guest.menu.inviteTitle', 'Invite friends to order together')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-storefront-text-muted">
            {tDefault('guest.menu.inviteCode', 'Invite code')}：
            <span className="ml-0.5 font-mono font-bold text-storefront-text">
              {props.joinCode}
            </span>
          </span>
          <Button size="sm" variant="storefront" onClick={props.onInvite}>
            {tDefault('guest.menu.invite', 'Invite')}
          </Button>
        </div>
      </div>
      <img
        src={joinCodeImg}
        alt=""
        aria-hidden
        className="h-16 w-auto shrink-0 object-contain"
      />
    </div>
  );
}
