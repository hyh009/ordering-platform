## Context

Guides followed: `docs/agent/backend/architecture.md`,
`docs/agent/workflows/shared-contracts.md`, the frontend layering in
`CLAUDE.md`, and `docs/agent/frontend/model-dto-boundary.md`.
`packages/shared` changes: yes.

Three things in the runtime decide the shape of this change.

**`show_products`'s tool call is discarded before anything can interrupt on
it.** The model does call it as a tool. It is bound as one of what
`runtime/agent.ts` calls the output-channel tools — "Nothing executes: the
middleware turns them into the turn's answer and ends the run, so they never
reach a tool node" — with `async () => ''` for a body. `planningMiddleware`'s
`afterModel` hook rewrites a proposal's call into a hydrated one and replaces
every other response with a plain `AIMessage` carrying only the reply, dropping
the call the model made. Only `propose_cart_operations` keeps a pending call,
and only it is listed in `humanInTheLoopMiddleware({ interruptOn })`.

This is why `interruptOn` cannot be extended on its own: the middleware
interrupts on a pending tool call, and by the time it runs there is none. The
hook order already supports the fix — `afterModel` hooks run last to first and
`planningMiddleware` is listed after the interrupt, so planning rewrites and
the interrupt then sees the result.

**A paused run already has a complete resume story.** The proposal path
interrupts, the guest decides, the run resumes, the tool executes, and the
decision is recorded on the turn's proposal snapshot — including `superseded`
for a guest who moved on instead of answering.

**A shown set is stored with no snapshot.** `AiOrderingTurnSnapshot` carries
`prompt?` for a `choices` response and `proposal?` for a proposal. A `products`
response carries neither, so there is nothing a tap could be resolved against.

### What the earlier versions of this change got wrong

**Version one** proposed that the model name the options the guest had stated,
that the server join them against the shown products, and that a tap open the
sheet with those options pre-ticked. Measurement showed: the model was already
answering correctly, so there was no model defect; `context.ts` already renders
`choices: <modifierId> (加料)` on every product, so the join told the model
nothing; and the client already holds the whole menu, so even the guest-facing
join needed no wire field. It was reverted unmerged.

**Version two** added a second tool, `ask_which_product`, so the model could
choose between showing and asking. Rejected because it raises what the model has
to understand in order to be correct, to decide something nothing actually needs
it to decide. Two tools taking product ids and differing only in what happens
after the guest taps is a distinction about the harness, not about the store or
the guest — and a model asked to make it can get the existing case wrong, which
it currently never does.

The lesson both versions point at: the four attempts before them asked the model
to fill a field, version two asked it to pick between two near-identical tools,
and the thing that was actually broken was never in the model at all.

## Decisions

### 1. Human-in-the-loop on both tools, not a second tool

`show_products` keeps its tool call instead of having it discarded, and is
added to `interruptOn` beside `propose_cart_operations`. One mechanism covers
both, and it is the mechanism already in place. Its stub body, `async () => ''`,
is where the resume lands, so the tool does not have to grow an implementation
either.

The model's surface does not change: same tools, same descriptions, same
arguments, same response types. Whether a tool interrupts is the harness's
business, and the model has never needed to know it for the proposal either.

### 2. The model is not asked whether this turn is browsing or asking

It calls `show_products` in both cases, as it does today. What the guest does
next decides which it was: a tap answers, typing supersedes, and ignoring the
cards costs nothing.

This is the division the rest of this feature follows — code solves what code
can, and the model is asked only what it alone can decide. "Did this guest want
to browse or to pick" is not knowable at the moment the cards are drawn, by the
model or by anyone else. It is knowable afterwards, by watching.

### 3. A tap resumes the run; it is not a new message

The paused run is where the question is still standing. Resuming it with the
picked product as the tool result is how the model hears the answer, and it
means a tap never enters the history window as a guest turn — the conversation
does not grow a message for every card touched.

The rejected alternative is sending the pick as a message with the product id
attached, which version two proposed. It would work, and it would also mean the
model re-reads its own question out of history to understand a message that
answers a question it is still, structurally, in the middle of asking.

### 4. The resumed run records a SECOND turn for the response it produces

`AiOrderingTurnSnapshot.response` is singular, and the replay harness, the
evaluation corpus, the merchant review surface and the history window all read
it that way. A turn holding a sequence of responses would change all four to
serve one case.

So the resume appends a turn whose `response` is the proposal, linked to the
shown set it answers. It is one agent run spanning two stored turns, which is
already true in a smaller way: the proposal path's resume runs after its turn
was written.

This is the one place the two interrupting tools differ, and it is worth stating
plainly: resuming a proposal produces RESULTS and a closing sentence, which
belong on the existing turn's decision record; resuming a shown set produces a
RESPONSE, which cannot.

### 5. A shown set is stored with a snapshot, like a prompt and a proposal

The turn record gains a third snapshot: the shown set, its identifier, and the
product ids it presented.

The reason is the one already written on the `choices` snapshot — resolving the
guest's answer against the guest's OWN conversation is what makes another
guest's shown set structurally unreachable. A tap validated against the live
menu instead of against the stored set would accept a product that question
never presented.

### 6. The shown set carries a decision record, with the same vocabulary as a proposal

Tapped, typed instead, superseded by a later message, or lapsed with the session.
Each is recorded, and none is inferred from absence.

This is the `superseded` argument transplanted: "you already answered this" and
"that offer lapsed, ask again" are different things to tell a guest, and a
shown set with no operations has nothing else to carry the difference. Without
the record, a reload cannot tell a guest who tapped from a guest who walked away.

### 7. Typing supersedes a standing shown set, exactly as it supersedes a proposal

The guest who answers `原味的` in words is answering. The guest who changes the
subject is not. Both arrive as a message, both settle the standing shown set,
and the existing supersede path is what settles it.

The pending interrupt is discarded with it. A run left paused against a question
nobody is going to answer is the same leak a stale proposal would be.

### 8. One surface for an assistant-originated add: the proposal card

The assistant panel's cards no longer open the configuration sheet. A tap
resumes, the model proposes, and the guest confirms on the proposal card.

The cost is real and is accepted: a guest who was only browsing now pays one
model call and one confirmation to add a crepe, where today the sheet opens
instantly. Two things make it the right trade.

The proposal card is already a configuration surface. An `add_item` operation
carries `choices` with `selectedOptionIds`, and the guest can fill in a choice
the assistant left open or change one it answered. Sugar, ice and add-ons are
set there today.

And the sheet is not lost. The menu grid opens it, unchanged, for every product
in the store. What goes away is the second, assistant-side route to it — the one
that bypassed everything the assistant knew, which is the defect this change
exists to close.

The rejected alternative is two kinds of tap, one resuming and one opening the
sheet. It puts the browsing-versus-asking judgement back, moved from the model
to the guest, who has even less to go on.

### 9. The stated option is not carried back to the model

Already measured: routed through `ask_choices`, the next turn proposes
`+ 原味蛋餅 ×1 · 雞塊` from history alone. Under this change the model is not
even in a new turn — it is mid-run, with its own question in context. Handing it
a field repeating what the guest said would be making it a relay.

If it proves unreliable, the fix is a regression case and a prompt line about
reading back what the guest asked for, not a field.

### 10. A shown set that can no longer be answered says so

The store shuts, a presented product sells out, the ordering session ends, or a
later message supersedes the set. In each case the cards stop being tappable and
say why, rather than resuming a run that cannot produce a valid proposal.

### 11. The badge is out of scope, and smaller than version one assumed

A mark reading `+雞塊 $20` on each card tells the guest, before they choose,
which crepes can take nuggets — saving the round trip of 「我要這個」→「這一種
沒有雞塊」. Real value, and now cheaper: one field naming the option the guest's
sentence meant, with the join done in the client against the menu it is already
rendering. `optionCarries` does not belong on the wire.

It is not what closes this hole, so it is not in this change.

### 12. `ask_choices` is untouched

Its five-option cap stays, and it keeps its place: a question answerable by
reading labels. Version two had to argue about whether a product question
inherits that cap. Under this change the question does not arise — a shown set
is bounded the way a shown set has always been bounded.


### 13. Both interrupting tools call the model when they resume

This reverses `cf3777f`, which ended a decided run at the tool whenever every
operation was accepted, so no model call followed a clean apply.

Two reasons to give it up. The guest confirmed something and the assistant
should say what happened in its own words — the per-row statuses report
outcomes, not a sentence. And the guest cannot tell which of the two interrupts
they are answering, so the two should not behave differently: a tap that answers
a question gets a reply, and a confirmation that changes the cart should not be
the one interaction met with silence.

What is given up is stated honestly: one model round trip on the tap that adds
to the cart, which is the interaction that should feel fastest. That was the
whole argument for `cf3777f` and it is still true.

What is NOT given up is why this is now affordable. `6914fef` already keeps a
decision that was applied when the closing call fails, so a provider error while
the sentence is being written no longer takes the executed decision with it.
That fix was the other half of the original risk, and it landed separately.

The failure case is unchanged — it already called the model, and it is still the
case where the sentence carries the most: "two went in, the third sold out" is
not something the per-row statuses say.

### 14. The closing sentence is stored and rendered, which today it is neither

`AiOrderingProposalDecisionData` already carries `reply`. The API fills it on a
failed apply. The storefront drops it: `commands.ts` passes only `results` and
`appliedSummaries` to `proposalDecided`, and the action takes no third argument.

So the one case `cf3777f` deliberately kept the model call for has been
producing a sentence nobody reads. Adding the call on success without fixing
that would buy a second unread sentence.

It is also stored on the decision record, which has `decidedAt`, `results`,
`superseded` and `appliedOperations` but no reply. Without storing it the
sentence survives until the guest reloads, after which the row statuses are
still there and the assistant's words are gone — a transcript that remembers the
outcome and forgets the explanation.

### 15. The model speaks when operations were ATTEMPTED, not whenever the guest acted

Decision 13 said the assistant should answer because the guest confirmed
something. That is too broad, and the cases make it obvious.

`record.results` holds only the operations that were EXECUTED: the proposal tool
receives the kept operations, and the dismissed ones are given
`outcome: 'rejected'` by the service afterwards. So the line this change draws
is the line the service already branches on, `keptOperations.length === 0`:

- **All kept, all succeeded** — the model speaks. Changed from `cf3777f`.
- **Some dismissed, every kept one succeeded** — the model speaks. Also changed;
  `record.results` carries only the kept ones, so this jumps to the end today.
- **Something failed** — the model speaks, as it already does. This is the case
  the closing call was kept for, and the case whose sentence is currently thrown
  away by the client.
- **Everything dismissed** — the model does NOT speak. Unchanged. Nothing was
  attempted, there is no outcome to report, and making the assistant answer a
  "no" is the kind of reply that reads as not listening. The proposal is settled
  and the paused run is left to expire, exactly as it is today.
- **The guest typed instead** — the model does NOT speak now. Unchanged. The
  proposal is settled as `superseded`, and the model is told on the NEXT turn
  through the proposal log, where it belongs: the guest asked something else, and
  the answer to that is the turn they are waiting for.

Stated as one rule: a decided run calls the model when the cart was asked to
change, whether or not the change succeeded. A decision that asked for nothing
is recorded and nothing more.

### 16. The mid-execution failure defect is untouched by this change

Known and still open: if the executor THROWS rather than returning failed
results, `record.results` stays null, `record.phase` never becomes `closing`,
and the turn 500s with the cart already partly changed.

Removing the jump-to-end does not fix it and does not make it worse — the hook
returned early on a non-`closing` phase anyway. It is recorded here only so the
next reader does not mistake decision 13 for having addressed it. It needs its
own change.


### 17. The model must be told what the guest dismissed, which today it is not

The three cases that now call the model share a mechanism and not an input, and
the middle one is short of what it needs.

`resumeProposal` resumes with `type: 'edit'`, rebuilding the WHOLE tool call
from the stored proposal with only the kept operations. The edit rewrites the
pending call in place, so after the resume the model sees a proposal of one
operation and a result line for one operation. It cannot mention the row the
guest removed, and it cannot know it ever proposed it.

That contradicts a rule this feature already wrote down for itself, on
`AiOrderingProposalDecision.results`: the results cover every operation
"including the dismissed ones", because "an operation with no entry here would
be an outcome the assistant has to infer from absence". The STORED record obeys
it. The model's view does not.

Today this costs nothing, because the sentence is discarded. Once it is shown,
a guest who removes the milk tea and keeps the black tea reads
「好的，紅茶已加入」 from an assistant that appears not to have noticed.

So the dismissed operations are reported to the model without being executed.
The tool keeps receiving exactly the kept operations — a tool handed operations
it must not run is a trap for the next reader — and the dismissed set is passed
to the agent separately, so the result it returns names every operation in the
proposal with its real outcome, matching what is stored.

The rejected alternative is editing the call to carry all operations with the
dismissed ones flagged. It would unify the two views in one place, which is
appealing, at the price of a tool whose arguments include things it must skip.

### 18. One comment becomes false and has to go

`resumeProposal` currently explains why a failure in the second half must not
fail the request, and part of its reasoning is that "the second produces a
sentence the panel does not even render". That stops being true here.

The conclusion it supports does NOT change — `6914fef` is still right, and a
provider error after the cart was written must still not lose the decision. Only
the reason changes: the sentence now reaches the guest, which makes losing it a
real loss and makes losing the recorded decision with it a worse one.


### 19. A fact about the controls on screen is written by the panel, not the assistant

The assistant leaves a choice it was not told — a sugar level, an ice level, a
size — for the guest to answer on the proposal. The card asks them one at a
time, which is right for answering and leaves the guest unable to see how much
is left: with a single choice open it shows a picker and no count at all, and
the guest cannot tell whether the assistant is waiting on them or has stopped.

So the panel names what is still waiting, derived from the operation's own
`choices`. It must be exactly right — a sentence that names a choice that is
not open, or misses one that is, is worse than no sentence — and it costs
nothing to derive. This is the division the rest of the feature follows, and the
precedent is already in the main spec: a proposal's per-operation label is
produced by the system.

Two consequences, both deliberate:

The proposal tool's description gains NO matching rule. Two owners for one
sentence is how the guest ends up reading the same thing twice, once as
interface and once as a reply.

And it is styled as the panel's own words rather than as the assistant's. The
panel already draws that line — a reply sits in a bubble, derived text sits
plain and muted — so an assistant that mentions a choice anyway reads as
agreeing with the interface rather than as a second voice.

The closing sentence after a decision stays the assistant's, by the same test:
whether the guest wants anything else is conversation, not a fact about a
control. The two never appear together — one belongs to a proposal still
waiting, the other to one already decided.


### 20. Measured: the model will not name the option the guest stated

Recorded because this is the evidence that settles the design, and because
without it the first version of this change looks like it was abandoned on an
argument rather than on a result.

Experiment, 2026-10-11 on `gemini-3.5-flash-lite`, the model actually served. A
`statedOptionIds` field was added to the `show_products` arguments against a
menu of twelve egg crepes that every one of which can take nuggets, and
`我要蛋餅加雞塊` was replayed six times — three with the instruction in the
field's description, three with it in the tool's description as well.

- showed all twelve products: **6 of 6**
- mentioned the nuggets in the reply: 3 of 6
  (`您可以選擇喜歡的口味並加購雞塊`)
- filled `statedOptionIds`: **0 of 6**

So the model understands the request and says so in prose, and will not put it
in a structured field. Strengthening the instruction did not move it, in either
of the two places a tool's instructions can live.

This kills the approach of carrying the stated option across the tap, which is
otherwise the better design: it needs no model call, keeps `show_products` to
showing, and the guest's tap reaches the configuration sheet as fast as it does
today. It depends on exactly one field that only the model can fill, and the
model will not fill it.

It is also the fifth time this feature has asked the model to fill a field and
been told no. The four before it are in
[[prompt-data-signals-outrank-prose]] and the plan of record. The axis that
works is which tool to call; the axis that does not is what to put in a field
the answer does not otherwise need.

Which leaves the tap going back to the model — decision 1 — not because it is
cheap, but because the cheaper design has now been measured and does not work.
