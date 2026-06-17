import { ArrowLeft, X } from 'lucide-react';

interface StorefrontPageHeaderProps {
  title: string;
  onBack?: () => void;
  /** Left control glyph: a back arrow (default) or a close cross. */
  backIcon?: 'back' | 'close';
  /** Optional circular store logo rendered on the right. */
  logoUrl?: string;
  logoAlt?: string;
}

/**
 * Shared storefront header. Both side cells are a fixed `2rem` and the title
 * column is `1fr` with centered text, so the title stays centered regardless of
 * which side controls are present.
 */
export function StorefrontPageHeader({
  title,
  onBack,
  backIcon = 'back',
  logoUrl,
  logoAlt,
}: StorefrontPageHeaderProps) {
  const LeftIcon = backIcon === 'close' ? X : ArrowLeft;

  return (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center px-4 py-2 sm:py-3">
      {onBack ? (
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60"
          type="button"
          onClick={onBack}
        >
          <LeftIcon className="h-5 w-5" />
        </button>
      ) : (
        <div />
      )}
      <h1 className="mb-0 text-center text-base font-semibold text-storefront-text justify-self-center">
        {title}
      </h1>
      {logoUrl ? (
        <img
          alt={logoAlt ?? ''}
          className="h-8 w-8 justify-self-end rounded-full border border-storefront-primary object-cover shadow-sm"
          src={logoUrl}
        />
      ) : (
        <div />
      )}
    </div>
  );
}
