import { ArrowLeft, Home, LogIn } from 'lucide-react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { buttonVariants } from '@/shared/components/ui/buttonVariants';
import { cn } from '@/shared/utils/cn';
import { useNotFoundPageVM } from './useNotFoundPageVM';

type NotFoundPageProps = {
  embedded?: boolean;
};

export function NotFoundPage({ embedded = false }: NotFoundPageProps) {
  const vm = useNotFoundPageVM();
  const { tDefault } = useAppTranslation();
  const DestinationIcon = vm.isAuthenticated ? Home : LogIn;

  return (
    <section
      className={cn(
        'mx-auto grid w-full max-w-5xl content-center gap-8 px-5 py-12 md:grid-cols-[minmax(0,1fr)_18rem] md:px-8',
        embedded ? 'min-h-[calc(100vh-4rem)]' : 'min-h-screen',
      )}
    >
      <div className="min-w-0">
        <p className="mb-3 text-xs font-bold tracking-[0.08em] text-primary uppercase">
          {tDefault('notFound.eyebrow', '404')}
        </p>
        <h1 className="mb-5 text-4xl leading-tight font-bold text-foreground md:text-5xl">
          {tDefault('notFound.title', 'Page not found')}
        </h1>
        <p className="max-w-xl text-base text-muted-foreground">
          {tDefault(
            'notFound.description',
            'The route does not exist, or the page may have moved.',
          )}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            className={buttonVariants({ variant: 'outline' })}
            onClick={vm.goBack}
            type="button"
          >
            <ArrowLeft aria-hidden="true" />
            {tDefault('notFound.back', 'Back')}
          </button>
          {vm.destination !== null && vm.destinationLabel !== null && (
            <Link className={buttonVariants()} to={vm.destination}>
              <DestinationIcon aria-hidden="true" />
              {vm.destinationLabel}
            </Link>
          )}
        </div>
      </div>

      <div
        aria-hidden="true"
        className={cn(
          'grid aspect-square w-full max-w-60 place-items-center justify-self-start rounded-lg border border-border bg-card shadow-sm',
          'md:justify-self-end',
        )}
      >
        <span className="text-6xl font-bold text-primary">404</span>
      </div>
    </section>
  );
}
