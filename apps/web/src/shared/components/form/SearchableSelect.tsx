import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Combobox as ComboboxPrimitive } from '@base-ui/react/combobox';
import {
  CheckIcon,
  ChevronDownIcon,
  LoaderCircleIcon,
  SearchIcon,
} from 'lucide-react';

import { cn } from '@/shared/utils/cn';

export type SearchableSelectOption = {
  disabled?: boolean;
  label: ReactNode;
  searchLabel?: string;
  value: string;
};

type SearchableSelectProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  className?: string;
  disabled?: boolean;
  emptyMessage?: ReactNode;
  hasMore?: boolean;
  id?: string;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  loadMoreLabel?: ReactNode;
  loadingMessage?: ReactNode;
  onLoadMore?: () => void;
  onSearchChange: (value: string) => void;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchValue: string;
  selectedOption?: SearchableSelectOption | null;
  value: string;
};

function optionToString(option: SearchableSelectOption | null | undefined) {
  if (!option) {
    return '';
  }

  if (option.searchLabel) {
    return option.searchLabel;
  }

  return typeof option.label === 'string' ? option.label : option.value;
}

export function SearchableSelect({
  className,
  disabled = false,
  emptyMessage = 'No results found.',
  hasMore = false,
  id,
  isLoading = false,
  isLoadingMore = false,
  loadMoreLabel = 'Load more',
  loadingMessage = 'Loading...',
  onLoadMore,
  onSearchChange,
  onValueChange,
  options,
  placeholder,
  searchValue,
  selectedOption: selectedOptionProp,
  value,
  ...props
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ignoredInputValueRef = useRef<string | null>(null);
  const selectedOption = useMemo(
    () =>
      selectedOptionProp ??
      options.find((option) => option.value === value) ??
      (value
        ? {
            label: value,
            searchLabel: value,
            value,
          }
        : null),
    [options, selectedOptionProp, value],
  );
  const selectedInputValue = optionToString(selectedOption);
  const inputValue = isOpen ? searchValue : selectedInputValue;
  const showEmpty = !isLoading && options.length === 0;
  const showLoadMore = hasMore && onLoadMore;

  return (
    <ComboboxPrimitive.Root
      disabled={disabled}
      filter={null}
      inputValue={inputValue}
      isItemEqualToValue={(itemValue, selectedValue) =>
        itemValue?.value === selectedValue?.value
      }
      itemToStringLabel={optionToString}
      itemToStringValue={(option) => option?.value ?? ''}
      items={options}
      open={isOpen}
      value={selectedOption}
      onInputValueChange={(nextInputValue) => {
        if (!isOpen) {
          return;
        }

        if (ignoredInputValueRef.current === nextInputValue) {
          ignoredInputValueRef.current = null;
          return;
        }

        ignoredInputValueRef.current = null;
        onSearchChange(nextInputValue);
      }}
      onOpenChange={setIsOpen}
      onValueChange={(nextValue) => {
        if (!nextValue) {
          return;
        }

        ignoredInputValueRef.current = optionToString(nextValue);
        onSearchChange('');
        onValueChange(nextValue.value);
      }}
    >
      <div className="relative">
        {isOpen ? (
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
        ) : null}
        <ComboboxPrimitive.Input
          {...props}
          id={id}
          className={cn(
            'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 pr-8 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
            isOpen && 'pl-8',
            className,
          )}
          disabled={disabled}
          placeholder={placeholder}
        />
        <ComboboxPrimitive.Trigger
          className="absolute top-1/2 right-2 inline-flex -translate-y-1/2 items-center justify-center text-muted-foreground disabled:pointer-events-none disabled:opacity-50"
          disabled={disabled}
        >
          <ComboboxPrimitive.Icon>
            <ChevronDownIcon className="size-4" />
          </ComboboxPrimitive.Icon>
        </ComboboxPrimitive.Trigger>
      </div>

      <ComboboxPrimitive.Portal>
        <ComboboxPrimitive.Positioner className="z-page-modal" sideOffset={4}>
          <ComboboxPrimitive.Popup className="max-h-64 w-(--anchor-width) min-w-36 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none">
            <ComboboxPrimitive.List className="max-h-56 overflow-y-auto p-1">
              {options.map((option) => (
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
              ))}

              {isLoading ? (
                <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground">
                  <LoaderCircleIcon className="size-4 animate-spin" />
                  <span>{loadingMessage}</span>
                </div>
              ) : null}

              {showEmpty ? (
                <ComboboxPrimitive.Empty className="px-2 py-2 text-sm text-muted-foreground">
                  {emptyMessage}
                </ComboboxPrimitive.Empty>
              ) : null}
            </ComboboxPrimitive.List>

            {showLoadMore ? (
              <div className="border-t border-border p-1">
                <button
                  className="flex w-full items-center justify-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                  disabled={disabled || isLoadingMore}
                  type="button"
                  onClick={onLoadMore}
                >
                  {isLoadingMore ? (
                    <LoaderCircleIcon className="size-4 animate-spin" />
                  ) : null}
                  <span>{isLoadingMore ? loadingMessage : loadMoreLabel}</span>
                </button>
              </div>
            ) : null}
          </ComboboxPrimitive.Popup>
        </ComboboxPrimitive.Positioner>
      </ComboboxPrimitive.Portal>
    </ComboboxPrimitive.Root>
  );
}
