import { useAppTranslation } from '@/app/i18n';

type AssistantProposalRecordProps = {
  operations: { operationId: string; summary: string }[];
  /**
   * True for the latest proposal on a transcript read back from the server,
   * where nothing is known about whether the guest acted on it.
   */
  isStale: boolean;
};

/**
 * A proposal shown as a record rather than a decision.
 *
 * Two cases reach this, and neither can be acted on. An earlier proposal in the
 * session has already been answered — its outcome went out with the next
 * message. The latest proposal on a restored transcript has an outcome the server
 * never learned, because an outcome is only reported when the guest sends their
 * next message; offering Apply on it could add the same items twice.
 *
 * Showing the rows anyway is the point: the guest can read what was suggested and
 * ask for it again, which is better than a reply whose subject has vanished.
 */
export function AssistantProposalRecord({
  operations,
  isStale,
}: AssistantProposalRecordProps) {
  const { tDefault } = useAppTranslation();

  return (
    <div className="rounded-xl border border-dashed border-storefront-border p-3">
      <ul className="flex flex-col gap-1">
        {operations.map((operation) => (
          <li
            key={operation.operationId}
            className="text-sm text-muted-foreground"
          >
            {operation.summary}
          </li>
        ))}
      </ul>

      {isStale ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {tDefault(
            'guest.assistant.staleProposalHint',
            'This suggestion is from before. Ask again if you still want it.',
          )}
        </p>
      ) : null}
    </div>
  );
}
