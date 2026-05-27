import type { ReactNode } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { cn } from '@/shared/utils/cn';

export type OptionsSelectOption = {
  disabled?: boolean;
  label: ReactNode;
  value: string;
};

type OptionsSelectProps = {
  'aria-describedby'?: string;
  'aria-invalid'?: boolean | 'false' | 'true';
  className?: string;
  disabled?: boolean;
  id?: string;
  onValueChange: (value: string) => void;
  options: OptionsSelectOption[];
  placeholder?: ReactNode;
  value: string;
};

/**
 * @reusable
 * @description Render a shared select control from plain option data.
 * @keywords select, dropdown, options, form, static list
 */
export function OptionsSelect({
  className,
  disabled = false,
  id,
  onValueChange,
  options,
  placeholder,
  value,
  ...props
}: OptionsSelectProps) {
  return (
    <Select
      disabled={disabled}
      items={options}
      value={value || null}
      onValueChange={(nextValue) => {
        onValueChange(nextValue ?? '');
      }}
    >
      <SelectTrigger
        {...props}
        id={id}
        className={cn('w-full min-w-0', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              disabled={option.disabled}
              value={option.value}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
