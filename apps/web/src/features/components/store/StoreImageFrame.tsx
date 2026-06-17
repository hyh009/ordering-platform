import { ImageIcon } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

type StoreImageFrameProps = {
  value: string | undefined;
  alt: string;
  // Controls the preview frame: a square-ish logo vs. a wide banner.
  variant: 'logo' | 'banner';
};

// Shared logo/banner preview box used by both the read-only details view and
// the upload field, so the frame sizing and empty placeholder stay in sync.
export function StoreImageFrame({ value, alt, variant }: StoreImageFrameProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/30',
        variant === 'logo' ? 'h-24 w-24' : 'h-24 w-48',
      )}
    >
      {value ? (
        <img alt={alt} className="h-full w-full object-cover" src={value} />
      ) : (
        <ImageIcon aria-hidden className="h-8 w-8 text-muted-foreground/50" />
      )}
    </div>
  );
}
