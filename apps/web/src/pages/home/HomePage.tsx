import {
  ArrowRight,
  CheckCircle2,
  LogIn,
  QrCode,
  ReceiptText,
  Store,
} from 'lucide-react';
import { Link } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import { PATHS } from '@/app/routing/paths';
import { buttonVariants } from '@/shared/components/ui/buttonVariants';
import { cn } from '@/shared/utils/cn';

export function HomePage() {
  const { tDefault } = useAppTranslation();

  const highlights = [
    {
      icon: QrCode,
      title: tDefault('home.highlights.qrTitle', 'QR ordering for every table'),
      description: tDefault(
        'home.highlights.qrDescription',
        'Guests open a store link, choose how they want to order, and start from their own phone.',
      ),
    },
    {
      icon: ReceiptText,
      title: tDefault('home.highlights.groupTitle', 'Shared group carts'),
      description: tDefault(
        'home.highlights.groupDescription',
        'Dine-in groups can invite others with a join code and keep adding items together.',
      ),
    },
    {
      icon: Store,
      title: tDefault(
        'home.highlights.storeTitle',
        'Store operations included',
      ),
      description: tDefault(
        'home.highlights.storeDescription',
        'Merchants manage menus, availability, store images, and incoming orders from the platform.',
      ),
    },
  ];

  const steps = [
    tDefault('home.steps.publish', 'Publish a storefront menu'),
    tDefault('home.steps.share', 'Share the store QR code or link'),
    tDefault('home.steps.track', 'Track carts and orders as they arrive'),
  ];

  return (
    <div className="bg-background text-foreground">
      <section className="relative isolate min-h-[calc(100vh-4rem)] overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-black/55" />

        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-5 py-14 md:px-8">
          <div className="max-w-3xl text-white">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/25">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {tDefault('home.eyebrow', 'Ordering Platform')}
            </p>
            <h1 className="max-w-3xl text-5xl leading-tight font-bold md:text-7xl">
              {tDefault(
                'home.title',
                'Online ordering built for modern store operations',
              )}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/85 md:text-xl">
              {tDefault(
                'home.description',
                'A multi-tenant ordering platform for storefront menus, guest group ordering, merchant order tracking, and platform administration.',
              )}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                className={cn(buttonVariants({ size: 'lg' }), 'gap-2')}
                to={PATHS.AUTH.LOGIN}
              >
                <LogIn aria-hidden="true" />
                {tDefault('home.actions.signIn', 'Sign in to manage')}
              </Link>
              <a
                className={cn(
                  buttonVariants({ size: 'lg', variant: 'outline' }),
                  'gap-2 border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white',
                )}
                href="#how-it-works"
              >
                {tDefault('home.actions.learnMore', 'See how it works')}
                <ArrowRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card" id="how-it-works">
        <div className="mx-auto grid max-w-6xl gap-5 px-5 py-10 md:grid-cols-3 md:px-8">
          {highlights.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-lg border border-border bg-background p-5"
              >
                <Icon
                  className="mb-4 h-7 w-7 text-primary"
                  aria-hidden="true"
                />
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-5 py-14 md:grid-cols-[0.9fr_1.1fr] md:px-8">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.08em] text-primary uppercase">
            {tDefault('home.steps.eyebrow', 'Workflow')}
          </p>
          <h2 className="text-3xl font-bold">
            {tDefault('home.steps.title', 'From menu setup to live ordering')}
          </h2>
        </div>
        <ol className="grid gap-3">
          {steps.map((step, index) => (
            <li
              key={step}
              className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {index + 1}
              </span>
              <span className="font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
