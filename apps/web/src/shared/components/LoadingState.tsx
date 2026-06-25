import { Spinner } from '@/shared/components/ui/spinner';

type LoadingStateProps = {
  label: string;
};

/**
 * @reusable
 * @description Render a simple centered loading state with a spinner.
 * @keywords loading, pending, status, spinner, page state
 */
export function LoadingState({ label }: LoadingStateProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
      <div
        className="flex flex-col items-center justify-center gap-3 px-5 py-8 text-muted-foreground"
        role="status"
      >
        <Spinner />
        <span>{label}</span>
      </div>
    </section>
  );
}
