import { ArrowLeft, X } from 'lucide-react';

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
      <div className="justify-self-end">
        {right === Right.Logo && logoUrl ? (
          <img
            alt={logoAlt ?? ''}
            className="h-8 w-8 rounded-full border border-storefront-primary object-cover shadow-sm"
            src={logoUrl}
          />
        ) : null}
      </div>
    </div>
  );

  if (sticky) {
    return (
      <header className="sticky top-0 z-20 border-b border-storefront-border bg-storefront-bg">
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
