import * as React from 'react';
import { Select as SelectPrimitive } from '@base-ui/react/select';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

export type SelectOption = {
  disabled?: boolean;
  label: React.ReactNode;
  value: string;
};

type SelectProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  className?: string;
  disabled?: boolean;
  id?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: React.ReactNode;
  value: string;
};

function Select({
  className,
  disabled = false,
  id,
  onValueChange,
  options,
  placeholder,
  value,
  ...props
}: SelectProps) {
  return (
    <SelectPrimitive.Root
      disabled={disabled}
      value={value || null}
      onValueChange={(nextValue) => {
        onValueChange(nextValue ?? '');
      }}
    >
      <SelectPrimitive.Trigger
        {...props}
        id={id}
        className={cn(
          'flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
          className,
        )}
      >
        <SelectPrimitive.Value
          className="truncate"
          placeholder={placeholder}
        />
        <SelectPrimitive.Icon className="shrink-0 text-muted-foreground">
          <ChevronDown className="h-4 w-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Positioner sideOffset={4}>
        <SelectPrimitive.Popup className="max-h-64 min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md outline-none">
          <SelectPrimitive.List>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                className="relative flex min-h-8 cursor-default items-center rounded-md py-1.5 pr-2 pl-8 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50"
                disabled={option.disabled}
                value={option.value}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 flex h-4 w-4 items-center justify-center">
                  <Check className="h-4 w-4" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>
                  {option.label}
                </SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Root>
  );
}

export { Select };
