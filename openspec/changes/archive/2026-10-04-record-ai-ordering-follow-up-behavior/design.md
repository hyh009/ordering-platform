## Context

See proposal.md for why this change exists. Everything it covers is already
implemented; the rationale for each behavior is written up at length in
`docs/features/ai-ordering.md`, and this document records only the decisions a
reader needs in order to trust the specs.

The work followed `docs/agent/backend/architecture.md` and
`docs/agent/backend/unit-testing.md` for the API, `docs/agent/frontend/architecture.md`
and `docs/agent/frontend/model-dto-boundary.md` for the web, and
`docs/agent/workflows/shared-contracts.md` for the shared contract. No
intentional deviation.

`packages/shared` contracts changed, and the change is already in place: the
`superseded` operation outcome, `settledProposal` on the turn response, and the
model answer on the merchant conversation DTO. This change adds nothing further.

## Goals / Non-Goals

**Goals:**

- Make the specs describe the system as it ships, so the five changes can be
  archived in order without a known contradiction.

**Non-Goals:**

- Any code change. Where recording a behavior exposed a gap, it is listed under
  Open Questions rather than fixed here.
- Rewriting the four earlier changes. They stay as the record of what was
  decided at the time; this change modifies their requirements going forward.

## Decisions

**A new change rather than edits to the earlier four.** The earlier changes are
complete and say what was true when they were written. Editing them would erase
that a lapsed proposal was once `no_action` and that repair was once a single
retry. A fifth change that MODIFIES those requirements keeps the history and
gives archive one more step. Alternative considered: amend
`tighten-ai-ordering-model-contract`, the most recent. Rejected because half of
this behavior (proposal lifetime, transcript outcomes) has nothing to do with the
model contract.

**The final attempt has the proposal tool unbound, not forbidden.** A change that
fails for a reason the model cannot fix — a sold-out product, an item that is
gone — fails the same way however often it is retried. Unbinding the tool turns
the last call from "might fail again" into "must produce something for the
guest". Alternative considered: three attempts that may all propose, with a
fixed notice when all fail. Rejected because the guest would then never learn
the actual reason.

**The system notice is fixed text, in the guest's language.** It appears only
when the final attempt produced nothing usable, which in practice means the
provider failed or the turn ran out of time. It is worded as a system message,
with no first person, because a line in the assistant's voice reads as something
the model said. Its language is read from the guest's message because it is the
only thing the guest reads that turn; the store's default locale is the fallback
only. Alternative considered: surface an error and store no turn. Rejected
because the turn would then exist only in the API log, and it is the one a
merchant most needs to review.

**What the last proposal proposed is shown beside its outcome, not in the
history.** The history block is append-only so its prefix stays cacheable;
marking one history turn as "the latest proposal" would rewrite earlier text
whenever a newer proposal appeared. Rendering it with the outcome also scopes it
to the most recent proposal by construction, and keeps it visible after that
turn leaves the history window. Alternative considered: keep every proposal's
operations in the history. Rejected because older proposals shown without their
outcomes would read as applied.

**Short codes are derived from the identifier, never numbered.** A numbered code
means something else whenever the menu is reordered, so a code the model carried
over would silently name a different product. The first eight hex digits of the
identifier's UUID point at the same identifier or at nothing, and validation
already rejects "nothing". Two identifiers that collide both keep their full
form.

**A proposal's lifetime is the session's, not its own.** The earlier requirement
gave a pending proposal a bounded lifetime after which its operations were
recorded as `no_action`. In practice nothing a guest does reaches that limit:
the paused run is kept for 24 hours, while the guest's session and the cart both
end at 12. What a guest can actually meet is the cart closing, which the cart
itself refuses — the first operation is recorded as `failed` and the rest as
`no_action`. The requirement is rewritten to say that, and renamed to match. A
paused run that is gone anyway — the store was cleared, or its expiry index
never built — still executes nothing and tells the guest so; in that case the
decision is left with an empty result list rather than a result per operation.
That is reachable only through a data fault, so it is recorded here rather than
specified. Alternative considered: shorten the paused run's lifetime to below
the session's. Rejected for now: it would turn that fault path into an ordinary
one before the empty result list is dealt with.

**Only a concurrent write is retried.** The cart layer already retries a lost
optimistic write three times with no pause. On the assistant's execution path
that code is raised only when the write did not apply, so repeating it is safe,
and a short wait usually clears a collision between people sharing a cart. Every
other failure would repeat identically.

**Provider failures are not handled here.** The chat model already retries rate
limits, server errors and network errors with backoff inside the per-call
timeout. Adding a retry layer above it would retry the retries.

## Risks / Trade-offs

- [The model's explanation on the final attempt cannot be verified] → It is
  written knowing nothing was proposed and with no way to propose, which removes
  the specific failure that prompted this: a reply promising a list that is gone.
- [The system notice exists in two languages only] → A guest writing in any
  other script receives the store's default language. Accepted: this is the
  fallback of a fallback.
- [The stored model answer holds short codes, not identifiers] → Merchant review
  shows codes in that one field. Accepted: it is the record of what the model
  wrote, and the code is the start of the identifier.
- [A version's fingerprint does not move when context assembly changes] →
  Several of these behaviors changed what the model is asked without changing
  any fingerprint, so stored turns from before and after are not separable by
  it. Not addressed here; see Open Questions.
- [`repairSucceeded` now also covers a successful explanation] → It no longer
  means only "the proposal was fixed". Comparisons across versions that
  straddle this change should read it together with the turn's response type.

## Open Questions

- Whether context assembly should be part of a version's fingerprint.
- When a proposal can no longer be resumed, the decision is recorded with an
  empty result list rather than a result per operation. See the decision on
  proposal lifetime above for why this is left as it is.
