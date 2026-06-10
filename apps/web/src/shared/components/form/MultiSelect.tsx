import type { ReactNode } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

export type MultiSelectOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

type MultiSelectProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  className?: string;
  disabled?: boolean;
  emptyMessage?: ReactNode;
  id?: string;
  onChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  value: string[];
};

/**
 * @reusable
 * @description Searchable multi-select that renders selected values as removable chips.
 * @keywords multi select, multiple select, combobox, chips, tags, tokens, picker
 */
export function MultiSelect({
  className,
  disabled = false,
  emptyMessage = 'No results found.',
  id,
  onChange,
  options,
  placeholder,
  value,
  ...props
}: MultiSelectProps) {
  const optionByValue = new Map(options.map((option) => [option.value, option]));
  const selectedOptions = value.map(
    (selectedValue) =>
      optionByValue.get(selectedValue) ?? {
        label: selectedValue,
        value: selectedValue,
      },
  );

  return (
    <ComboboxPrimitive.Root
      disabled={disabled}
      isItemEqualToValue={(itemValue, selectedValue) =>
        itemValue?.value === selectedValue?.value
      }
      items={options}
      itemToStringLabel={(option) => option?.label ?? ''}
      itemToStringValue={(option) => option?.value ?? ''}
      multiple
      onValueChange={(nextValue) => {
        onChange(nextValue.map((option) => option.value));
      }}
      value={selectedOptions}
    >
      <ComboboxPrimitive.Chips
        className={cn(
          'flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 text-base transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:bg-input/50 has-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30',
          className,
        )}
      >
        <ComboboxPrimitive.Value>
          {(selected: MultiSelectOption[]) =>
            selected.map((option) => (
              <ComboboxPrimitive.Chip
                key={option.value}
                className="flex items-center gap-1 rounded-md bg-secondary py-0.5 pr-1 pl-2 text-xs font-medium text-secondary-foreground"
              >
                {option.label}
                <ComboboxPrimitive.ChipRemove
                  aria-label="Remove"
                  className="inline-flex items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3" />
                </ComboboxPrimitive.ChipRemove>
              </ComboboxPrimitive.Chip>
            ))
          }
        </ComboboxPrimitive.Value>

        <ComboboxPrimitive.Input
          {...props}
          id={id}
          className="h-6 min-w-24 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted-foreground md:text-sm"
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : undefined}
        />

        <ComboboxPrimitive.Trigger
          className="ml-auto inline-flex items-center justify-center self-stretch px-1 text-muted-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
        >
          <ComboboxPrimitive.Icon>
            <ChevronDownIcon className="size-4" />
          </ComboboxPrimitive.Icon>
        </ComboboxPrimitive.Trigger>
      </ComboboxPrimitive.Chips>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className="z-page-modal" sideOffset={4}>
          <ComboboxPrimitive.Popup className="max-h-64 w-(--anchor-width) min-w-36 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <ComboboxPrimitive.Empty className="px-2 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </ComboboxPrimitive.Empty>
            <ComboboxPrimitive.List className="max-h-56 overflow-y-auto p-1">
              {(option: MultiSelectOption) => (
                <ComboboxPrimitive.Item
                  key={option.value}
                  className="relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  disabled={option.disabled}
                  value={option}
                >
                  <span className="flex flex-1 items-center gap-2 whitespace-nowrap">
                    {option.label}
                  </span>
                  <ComboboxPrimitive.ItemIndicator className="absolute right-2 flex size-4 items-center justify-center">
                    <CheckIcon className="size-4" />
                  </ComboboxPrimitive.ItemIndicator>
                </ComboboxPrimitive.Item>
              )}
            </ComboboxPrimitive.List>
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
