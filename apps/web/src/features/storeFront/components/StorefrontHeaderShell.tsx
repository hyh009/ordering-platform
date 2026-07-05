import type { ReactNode } from 'react';

/**
 * Shared class for the round icon buttons in the storefront header (back/close).
 * Kept here so the real header and its loading skeleton stay visually in sync.
 */
export const storefrontHeaderButtonClass =
  'flex h-8 w-8 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60';

type StorefrontHeaderShellProps = {
  /** Wrap in a sticky `<header>`; otherwise render the bare content row. */
  sticky?: boolean;
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
};

/**
 * Layout shell for the storefront header: the sticky bar and the three-column
 * (back · title · logo) grid. Both `StorefrontPageHeader` and the chunk-loading
 * skeleton (`StorefrontChunkFallback`) render through this so their dimensions
 * and sticky styling can never drift apart.
 */
export function StorefrontHeaderShell({
  sticky,
  left,
  middle,
  right,
}: StorefrontHeaderShellProps) {
  const content = (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center px-4 py-2 sm:py-3">
      <div>{left}</div>
      <div className="justify-self-center">{middle}</div>
      {/* relative so a desktop dropdown can anchor to this column's right edge */}
      <div className="relative justify-self-end">{right}</div>
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
