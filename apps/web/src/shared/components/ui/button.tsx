import { Button as ButtonPrimitive } from '@base-ui/react/button';
import type { VariantProps } from 'class-variance-authority';

import { buttonVariants } from '@/shared/components/ui/buttonVariants';
import { cn } from '@/shared/utils/cn';

/**
 * @reusable
 * @description Render a shared button primitive with the repo's variant recipe.
 * @keywords button, action, submit, trigger, cta, icon button
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button };
