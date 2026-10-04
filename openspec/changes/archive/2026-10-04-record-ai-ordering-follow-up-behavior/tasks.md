Every implementation task below was completed before this change was written.
Each names the commit that delivered it and the test that pins it.

## 1. Shared contracts

- [x] 1.1 Add the `superseded` operation outcome, separate from `no_action`
      (`8e010d6`); verify `aiOrdering.contract.test.ts` passes
- [x] 1.2 Add `settledProposal` to the turn response (`8bd92a8`); verify
      `aiOrdering.service.test.ts` "reports the settled proposal back to the
      panel" passes
- [x] 1.3 Add the model answer to the merchant conversation DTO (`a17deb0`);
      verify `aiOrdering.merchant.test.ts` passes
- [x] 1.4 Verify the shared package per `docs/agent/workflows/verification.md`:
      `pnpm --filter @repo/shared run build` succeeds

## 2. API

- [x] 2.1 Settle an unanswered proposal at the start of the next turn, through
      the same conditional claim an acceptance uses (`8bd92a8`); verify the
      "AiOrderingService proposal lifetime" tests pass
- [x] 2.2 Project the stored model answer onto the review DTO and drop a shape
      it does not recognize (`a17deb0`); verify `aiOrdering.merchant.test.ts`
      passes
- [x] 2.3 Describe what each operation of the last proposal proposed beside its
      outcome (`0908c55`); verify `aiOrdering.context.test.ts` "says what each
      operation proposed, not only its id" passes
- [x] 2.4 Bound repair at three calls with the proposal tool unbound on the
      third, and never show the reply written beside a failed proposal
      (`166e35f`); verify `aiOrdering.agent.test.ts` "lets the model explain,
      without the proposal tool, once two proposals failed" passes
- [x] 2.5 Return a fixed system notice, in the guest's language, when the third
      call yields nothing usable (`166e35f`); verify
      `aiOrdering.emptyProposalReply.test.ts` passes
- [x] 2.6 Retry an accepted operation that loses a concurrent cart write
      (`7088080`); verify `aiOrdering.cartExecution.test.ts` "a concurrent cart
      write" tests pass
- [x] 2.7 Show the assistant short codes and resolve them after the output gate
      (`5a112bf`); verify `aiOrdering.shortCodes.test.ts` passes
- [x] 2.8 Verify the API per `docs/agent/workflows/verification.md`:
      `pnpm --filter api run test`, `lint` and `build` succeed

## 3. Web

- [x] 3.1 Show what the model answered in merchant conversation review
      (`d734d54`); verify the web tests pass
- [x] 3.2 Add a merchant navigation entry for the conversation list (`0c6b5d5`);
      verify the entry leads to the list
- [x] 3.3 Write a proposal's recorded outcome onto its transcript entry, matched
      by proposal id (`d275ed4`); verify the web tests pass
- [x] 3.4 Verify the web app per `docs/agent/workflows/verification.md` and
      `docs/agent/frontend/architecture-validation.md`: `pnpm --filter web run
      lint`, `test` and `build` succeed

## 4. Documentation

- [x] 4.1 Record each behavior in `docs/features/ai-ordering.md` (`e750729`,
      `34cec45`, `8379272`, `f1ae5a7`, `9ad58bd`); verify the degradation
      ladder, the outcome table and the short-code section match the code
- [ ] 4.2 Check the assistant panel and merchant review by hand against the
      manual checks in `docs/features/ai-ordering.md`; verify a lapsed proposal,
      a failed proposal explained by the assistant, and the review of a model
      answer each read as specified
