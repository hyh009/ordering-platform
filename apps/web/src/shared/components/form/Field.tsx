import { cloneElement, type ReactElement, type ReactNode, useId } from 'react';

import { cn } from '@/shared/utils/cn';

type FieldControlProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  id?: string;
};

type FieldProps = {
  className?: string;
  description?: ReactNode;
  error?: ReactNode;
  id?: string;
  label: ReactNode;
  required?: boolean;
  showErrorMessage?: boolean;
} & (
  | { children: ReactElement<FieldControlProps>; renderControl?: never }
  | { children?: never; renderControl: ReactNode | ((id: string) => ReactNode) }
);

function joinIds(...ids: Array<string | undefined>) {
  const value = ids.filter(Boolean).join(' ');
  return value.length > 0 ? value : undefined;
}

/**
 * @reusable
 * @description Accessible form field wrapper with label, description, and error wiring.
 * @keywords field, form field, label, error, description, aria
 */
export function Field({
  children,
  className,
  description,
  error,
  id,
  label,
  renderControl,
  required = false,
  showErrorMessage = true,
}: FieldProps) {
  const generatedId = useId();
  const controlId = id ?? children?.props.id ?? `field-${generatedId}`;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = showErrorMessage ? `${controlId}-error` : undefined;

  const isRenderFn = typeof renderControl === 'function';

  const control = children
    ? cloneElement(children, {
        'aria-describedby': joinIds(
          children.props['aria-describedby'],
          descriptionId,
          error && showErrorMessage ? errorId : undefined,
        ),
        'aria-invalid': error ? true : children.props['aria-invalid'],
        id: controlId,
      })
    : isRenderFn
      ? renderControl(controlId)
      : renderControl;

  return (
    <div className={cn('grid gap-1.5', className)}>
      <label
        className={cn(
          'text-sm font-medium',
          error ? 'text-destructive' : 'text-foreground',
        )}
        htmlFor={children || isRenderFn ? controlId : undefined}
      >
        {label}
        {required ? (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {description ? (
        <p className="text-sm text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}

      {control}

      {showErrorMessage ? (
        <p
          className="min-h-5 text-sm font-medium text-destructive"
          id={errorId}
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
