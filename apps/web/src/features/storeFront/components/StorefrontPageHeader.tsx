/* eslint-disable react-refresh/only-export-components -- compound component:
   `StorefrontPageHeader` is exported via Object.assign with its slot maps, which
   the react-refresh rule cannot recognize as a single component export. */
import { useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { useAppTranslation } from '@/app/i18n';
import { cn } from '@/shared/utils/cn';
import { useStorefrontHeaderMenu } from './useStorefrontHeaderMenu';

const Left = {
  Back: 'back',
  Close: 'close',
} as const;

const Middle = {
  Title: 'title',
} as const;

const Right = {
  Logo: 'logo',
} as const;

type LeftSlot = (typeof Left)[keyof typeof Left];
type MiddleSlot = (typeof Middle)[keyof typeof Middle];
type RightSlot = (typeof Right)[keyof typeof Right];

interface StorefrontPageHeaderProps {
  sticky?: boolean;
  left?: LeftSlot;
  middle?: MiddleSlot;
  right?: RightSlot;
  title?: string;
  onBack?: () => void;
  logoUrl?: string;
  logoAlt?: string;
}

// Isolated so store subscriptions (via useStorefrontHeaderMenu) only exist when
// the logo slot is actually rendered.
function LogoMenuButton({
  logoUrl,
  logoAlt,
}: {
  logoUrl: string;
  logoAlt?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useStorefrontHeaderMenu();
  const { tDefault } = useAppTranslation();
  const storeName = logoAlt ?? '';

  return (
    <>
      <button
        aria-label={
          storeName || tDefault('guest.header.storeMenu', 'Store menu')
        }
        className="block rounded-full focus-visible:outline-2 focus-visible:outline-storefront-primary"
        type="button"
        onClick={() => setMenuOpen((o) => !o)}
      >
        <img
          alt={storeName}
          className="h-8 w-8 rounded-full border border-storefront-primary object-cover shadow-sm"
          src={logoUrl}
        />
      </button>

      {menuOpen ? (
        <>
          {/* Backdrop: dark on mobile, transparent click-catcher on desktop */}
          <div
            aria-hidden
            className="fixed inset-0 z-dropdown bg-black/40 lg:bg-transparent"
            onClick={() => setMenuOpen(false)}
          />

          {/* Panel: fullscreen on mobile, dropdown on desktop */}
          <div
            aria-label={tDefault('guest.header.storeMenu', 'Store menu')}
            aria-modal="true"
            role="dialog"
            className="fixed inset-0 z-page-modal flex flex-col bg-storefront-bg lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:mt-1 lg:w-60 lg:rounded-xl lg:border lg:border-storefront-border lg:shadow-lg"
          >
            {/* Row 1: store name + mobile close button */}
            <div className="flex items-center justify-between border-b border-storefront-border px-4 py-3">
              <span className="truncate text-sm font-semibold text-storefront-text">
                {storeName}
              </span>
              <button
                aria-label={tDefault('common.close', 'Close')}
                className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60 lg:hidden"
                type="button"
                onClick={() => setMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Row 2: language switcher (only shown when store supports 2+ languages) */}
            {menu.languageOptions.length > 0 ? (
              <div className="p-2">
                <p className="px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-storefront-text-muted">
                  {tDefault('guest.header.language', 'Language')}
                </p>
                {menu.languageOptions.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      'flex w-full rounded-lg px-3 py-2 text-left text-sm',
                      menu.currentLanguage === opt.value
                        ? 'bg-storefront-primary/10 font-medium text-storefront-primary'
                        : 'text-storefront-text hover:bg-storefront-border/60',
                    )}
                    type="button"
                    onClick={() => {
                      menu.handleLanguageSelect(opt.value);
                      setMenuOpen(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}

function StorefrontPageHeaderRoot({
  sticky,
  left,
  middle,
  right,
  title,
  onBack,
  logoUrl,
  logoAlt,
}: StorefrontPageHeaderProps) {
  const LeftIcon = left === Left.Close ? X : ArrowLeft;

  const content = (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center px-4 py-2 sm:py-3">
      <div>
        {left ? (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60"
            type="button"
            onClick={onBack}
          >
            <LeftIcon className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div className="justify-self-center">
        {middle === Middle.Title && title ? (
          <h1 className="mb-0 text-center text-base font-semibold text-storefront-text">
            {title}
          </h1>
        ) : null}
      </div>

      {/* relative here so the desktop dropdown anchors to this column's right edge */}
      <div className="relative justify-self-end">
        {right === Right.Logo && logoUrl ? (
          <LogoMenuButton logoUrl={logoUrl} logoAlt={logoAlt} />
        ) : null}
      </div>
    </div>
  );

  if (sticky) {
    return (
      <header className="sticky top-0 z-sticky border-b border-storefront-border bg-storefront-bg">
        {content}
      </header>
    );
  }

  return content;
}

export const StorefrontPageHeader = Object.assign(StorefrontPageHeaderRoot, {
  Left,
  Middle,
  Right,
});
