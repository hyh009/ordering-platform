import { useAppTranslation } from '@/app/i18n';

export function UserHomePage() {
  const { tDefault } = useAppTranslation();

  return (
    <section className="mx-auto grid w-full max-w-5xl gap-4 px-5 py-8 md:px-8">
      <p className="mb-2 text-xs font-bold tracking-[0.08em] text-primary uppercase">
        {tDefault('home.eyebrow', 'Management')}
      </p>
      <h1 className="mb-3 text-3xl leading-tight font-bold md:text-4xl">
        {tDefault('home.title', 'Home')}
      </h1>
      <p className="max-w-2xl text-base text-muted-foreground">
        {tDefault('home.description', 'This workspace is not available yet.')}
      </p>
    </section>
  );
}
