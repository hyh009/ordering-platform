type LoadingStateProps = {
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8">
      <div
        className="rounded-lg border border-border bg-card px-5 py-4 text-foreground"
        role="status"
      >
        {label}
      </div>
    </section>
  );
}
