import * as React from 'react';
import { Languages, Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  type LocalizedStringDto,
  type SupportedLocale,
  supportedLocales,
} from '@repo/shared';

import { Button } from '@/shared/components/ui/button';
import { buttonVariants } from '@/shared/components/ui/buttonVariants';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Textarea } from '@/shared/components/ui/textarea';
import { cn } from '@/shared/utils/cn';

export interface LocalizedStringInputProps {
  value?: LocalizedStringDto;
  onChange?: (value: LocalizedStringDto) => void;
  defaultLocale: SupportedLocale;
  allowedLocales?: readonly SupportedLocale[];
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  className?: string;
}

const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
};

export function LocalizedStringInput({
  value = {},
  onChange,
  defaultLocale,
  allowedLocales,
  placeholder,
  disabled,
  multiline = false,
  className,
}: LocalizedStringInputProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [activeLocales, setActiveLocales] = React.useState<SupportedLocale[]>(
    [],
  );

  const filledLocales = React.useMemo(() => {
    return (Object.keys(value) as SupportedLocale[]).filter(
      (l) => l !== defaultLocale && value[l] !== undefined && value[l] !== '',
    );
  }, [value, defaultLocale]);

  const displayLocales = React.useMemo(() => {
    const all = new Set([...filledLocales, ...activeLocales]);
    return Array.from(all);
  }, [filledLocales, activeLocales]);

  const availableLocales = React.useMemo(() => {
    const pool = allowedLocales ?? (supportedLocales as readonly SupportedLocale[]);
    return pool.filter((l) => l !== defaultLocale && !displayLocales.includes(l));
  }, [allowedLocales, displayLocales, defaultLocale]);

  const handleValueChange = (locale: SupportedLocale, newValue: string) => {
    onChange?.({
      ...value,
      [locale]: newValue || undefined,
    });
  };

  const addLocale = (locale: SupportedLocale) => {
    setActiveLocales((prev) => [...prev, locale]);
  };

  const removeLocale = (locale: SupportedLocale) => {
    setActiveLocales((prev) => prev.filter((l) => l !== locale));
    const newValue = { ...value };
    delete newValue[locale];
    onChange?.(newValue);
  };

  const InputComponent = multiline ? Textarea : Input;

  if (!isEditing) {
    return (
      <div
        className={cn(
          'group relative rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 truncate">
            {value[defaultLocale] || (
              <span className="text-muted-foreground">
                {placeholder || '未填寫'}
              </span>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => setIsEditing(true)}
            disabled={disabled}
            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <Pencil className="size-3" />
          </Button>
        </div>

        {filledLocales.length > 0 && (
          <div className="mt-1.5 space-y-0.5 border-t border-border/50 pt-1.5">
            {filledLocales.map((locale) => (
              <div key={locale} className="flex items-baseline gap-1.5 truncate">
                <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                  {LOCALE_LABELS[locale]}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {value[locale]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'space-y-4 rounded-lg border border-border p-4 bg-muted/30',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Languages className="size-4" />
          多語言編輯
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsEditing(false)}
        >
          <X className="size-3" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Default Locale Field (Fixed) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">
              {LOCALE_LABELS[defaultLocale]}{' '}
              <span className="text-muted-foreground font-normal">(預設)</span>
            </Label>
          </div>
          <InputComponent
            value={value[defaultLocale] || ''}
            onChange={(e) => handleValueChange(defaultLocale, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="bg-background"
          />
        </div>

        {/* Dynamic Locale Fields */}
        {displayLocales.map((locale) => (
          <div
            key={locale}
            className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">
                {LOCALE_LABELS[locale]}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeLocale(locale)}
                disabled={disabled}
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
            <InputComponent
              value={value[locale] || ''}
              onChange={(e) => handleValueChange(locale, e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="bg-background"
            />
          </div>
        ))}
      </div>

      {/* Add Language Button */}
      {availableLocales.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={
              buttonVariants({ variant: 'outline', size: 'sm' }) +
              ' w-full border-dashed'
            }
            disabled={disabled}
            type="button"
          >
            <Plus className="mr-2 size-3" />
            新增語言
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {availableLocales.map((locale) => (
              <DropdownMenuItem key={locale} onClick={() => addLocale(locale)}>
                {LOCALE_LABELS[locale]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <div className="flex justify-end pt-2 border-t border-border">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsEditing(false)}
        >
          完成
        </Button>
      </div>
    </div>
  );
}
