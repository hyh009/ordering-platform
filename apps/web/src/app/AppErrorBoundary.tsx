import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { useAppTranslation } from '@/app/i18n';
import {
  ErrorBoundary,
  type ErrorBoundaryFallbackProps,
} from '@/shared/components/ErrorBoundary';
import { Button } from '@/shared/components/ui/button';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorFallbackProps = ErrorBoundaryFallbackProps & {
  isFullScreen?: boolean;
  onGoHome?: () => void;
};

function reportBoundaryError(error: Error, errorInfo: ErrorInfo) {
  console.error('React error boundary caught an error', {
    componentStack: errorInfo.componentStack,
    error,
  });
}

function AppErrorFallback({
  error,
  isFullScreen = false,
  onGoHome,
  resetErrorBoundary,
}: AppErrorFallbackProps) {
  const { tDefault } = useAppTranslation();
  const content = (
    <section
      aria-labelledby="app-error-title"
      className="mx-auto grid w-full max-w-2xl gap-5 rounded-lg border border-border bg-card p-6 shadow-sm"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <AlertTriangle aria-hidden="true" className="size-5" />
        </span>
        <div>
          <h1
            className="mb-2 max-w-none text-2xl leading-tight"
            id="app-error-title"
          >
            {tDefault('app.errorBoundary.title', 'Something went wrong')}
          </h1>
          <p className="m-0 text-sm text-muted-foreground">
            {tDefault(
              'app.errorBoundary.description',
              'The page stopped rendering. Try again, or return home.',
            )}
          </p>
        </div>
      </div>

      {import.meta.env.DEV ? (
        <pre className="max-h-44 overflow-auto rounded-lg border border-border bg-muted p-3 text-xs whitespace-pre-wrap text-muted-foreground">
          {error.message}
        </pre>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button onClick={resetErrorBoundary} type="button">
          <RotateCcw aria-hidden="true" className="size-4" />
          {tDefault('app.errorBoundary.tryAgain', 'Try again')}
        </Button>
        {onGoHome ? (
          <Button onClick={onGoHome} type="button" variant="outline">
            <Home aria-hidden="true" className="size-4" />
            {tDefault('app.errorBoundary.home', 'Home')}
          </Button>
        ) : null}
      </div>
    </section>
  );

  if (!isFullScreen) {
    return <div className="px-5 py-8 md:px-8">{content}</div>;
  }

  return (
    <main className="min-h-screen bg-background px-5 py-10 text-foreground md:px-8">
      {content}
    </main>
  );
}

export function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={(fallbackProps) => (
        <AppErrorFallback {...fallbackProps} isFullScreen />
      )}
      onError={reportBoundaryError}
    >
      {children}
    </ErrorBoundary>
  );
}

export function RouteErrorBoundary() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      fallback={(fallbackProps) => (
        <AppErrorFallback
          {...fallbackProps}
          isFullScreen
          onGoHome={() => {
            fallbackProps.resetErrorBoundary();
            navigate('/', {
              replace: true,
            });
          }}
        />
      )}
      onError={reportBoundaryError}
      resetKeys={[location.pathname, location.search]}
    >
      <Outlet />
    </ErrorBoundary>
  );
}

export function PageErrorBoundary({ children }: AppErrorBoundaryProps) {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ErrorBoundary
      fallback={(fallbackProps) => (
        <AppErrorFallback
          {...fallbackProps}
          onGoHome={() => {
            fallbackProps.resetErrorBoundary();
            navigate('/', {
              replace: true,
            });
          }}
        />
      )}
      onError={reportBoundaryError}
      resetKeys={[location.pathname, location.search]}
    >
      {children}
    </ErrorBoundary>
  );
}
