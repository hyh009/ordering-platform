import type { ReactNode } from 'react';

type ReadOnlyFieldProps = {
  label: ReactNode;
  children: ReactNode;
};

/**
 * @reusable
 * @description Stacked label/value pair for read-only detail views.
 * @keywords read-only, view, detail, label, value, field
 */
export function ReadOnlyField({ label, children }: ReadOnlyFieldProps) {
  return (
    <div className="grid gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}
