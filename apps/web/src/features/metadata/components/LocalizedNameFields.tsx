import { useAppTranslation } from '@/app/i18n';
import { Field } from '@/shared/components/form/Field';
import { Input } from '@/shared/components/ui/input';

type LocalizedNameValues = {
  en: string;
  zhTw: string;
};

type LocalizedNameFieldErrors = Partial<
  Record<keyof LocalizedNameValues, string>
>;

type LocalizedNameFieldsProps = {
  errors: LocalizedNameFieldErrors;
  onFieldChange: (field: keyof LocalizedNameValues, value: string) => void;
  values: LocalizedNameValues;
};

export function LocalizedNameFields({
  errors,
  onFieldChange,
  values,
}: LocalizedNameFieldsProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        error={errors.zhTw}
        label={tDefault('admin.metadata.nameZhTw', 'Chinese name')}
        required
      >
        <Input
          value={values.zhTw}
          onChange={(event) => {
            onFieldChange('zhTw', event.target.value);
          }}
        />
      </Field>
      <Field
        error={errors.en}
        label={tDefault('admin.metadata.nameEn', 'English name')}
      >
        <Input
          value={values.en}
          onChange={(event) => {
            onFieldChange('en', event.target.value);
          }}
        />
      </Field>
    </div>
  );
}
