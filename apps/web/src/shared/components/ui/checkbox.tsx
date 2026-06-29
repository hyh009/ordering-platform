import * as React from 'react';

import { cn } from '@/shared/utils/cn';

/**
 * @reusable
 * @description Render a styled native checkbox primitive.
 * @keywords checkbox, check, toggle, boolean, form control
 */
function Checkbox({
  className,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        'h-4 w-4 shrink-0 rounded-sm border border-input accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
