import { ArrowLeft } from 'lucide-react';

interface StorefrontPageHeaderProps {
  title: string;
  onBack?: () => void;
}

export function StorefrontPageHeader({ title, onBack }: StorefrontPageHeaderProps) {
  return (
    <div className="grid grid-cols-[2rem_1fr_2rem] items-center px-4 py-3">
      {onBack ? (
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full text-storefront-text hover:bg-storefront-border/60"
          type="button"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      ) : (
        <div />
      )}
      <h1 className="mb-0 text-center text-base font-semibold text-storefront-text">
        {title}
      </h1>
      <div />
    </div>
  );
}
