import { OptionsSelect } from '@/shared/components/form/OptionsSelect';
import { cn } from '@/shared/utils/cn';

type FilterSelectProps<T extends string> = {
  value: T;
  options: { label: string; value: T }[];
  onChange: (value: T) => void;
  className?: string;
};

/**
 * @reusable
 * @description Compact typed select for list filters (status, visibility) in a table toolbar.
 * @keywords filter, select, dropdown, toolbar, options
 */
export function FilterSelect<T extends string>({
  value,
  options,
  onChange,
  className,
}: FilterSelectProps<T>) {
  return (
    <OptionsSelect
      className={cn('h-8 w-40', className)}
      onValueChange={(next) => onChange(next as T)}
      options={options}
      value={value}
    />
  );
}
