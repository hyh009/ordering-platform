import { AIMessage } from '@langchain/core/messages';
import { Command, MemorySaver } from '@langchain/langgraph';
import { fakeModel } from 'langchain';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AI_ORDERING_CART_FIXTURE,
  AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  AI_ORDERING_MENU_FIXTURE,
} from './fixtures/aiOrdering.js';
import { AI_ORDERING_EMPTY_PROPOSAL_REPLY } from '../src/modules/aiOrdering/emptyProposalReply.js';
import { createAiOrderingAgent } from '../src/modules/aiOrdering/runtime/agent.js';
import { toGeminiToolSchema } from '../src/modules/aiOrdering/runtime/geminiSchema.js';
import { nextAiOrderingCallTimeoutMs } from '../src/modules/aiOrdering/runtime/model.js';
import { resolveAiOrderingVersion } from '../src/modules/aiOrdering/versions/index.js';

import type { AiOrderingCartExecutor } from '../src/modules/aiOrdering/cartExecution.js';
import type { AiOrderingValidationInput } from '../src/modules/aiOrdering/validation.js';

const config = resolveAiOrderingVersion('v1-2026-09-30');

if (!config) {
  throw new Error('the test needs a released assistant version');
}

function assembledContext() {
  return {
    versionId: config!.versionId,
    blocks: [
      {
        role: 'system' as const,
        text: 'SYSTEM: you are an ordering assistant',
      },
      { role: 'user' as const, text: 'MENU: steamed rice' },
      { role: 'user' as const, text: 'CART: empty' },
      { role: 'user' as const, text: 'GUEST: one steamed rice please' },
    ],
  };
}

function proposalCall(productId = 'prod-rice') {
  return {
    name: 'propose_cart_operations',
    args: {
      reply: 'I can add that.',
      operations: [
        {
          type: 'add_item',
          summary: 'Add one steamed rice',
          item: { productId, quantity: 1 },
        },
      ],
    },
    id: 'call_1',
  };
}

function agentInput(input: {
  model: ReturnType<typeof fakeModel>;
  executor: AiOrderingCartExecutor;
}) {
  let sequence = 0;

  return {
    config: config!,
    context: assembledContext(),
    validation: {
      menu: AI_ORDERING_MENU_FIXTURE,
      cart: AI_ORDERING_CART_FIXTURE,
      participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
    },
    confirmationRequired: true,
    locale: 'zh-TW' as const,
    guestMessage: '請給我一碗白飯',
    newId: (prefix: string) => {
      sequence += 1;
      return `${prefix}-${String(sequence)}`;
    },
    toToolSchema: (schema: unknown) =>
      toGeminiToolSchema(schema as never) as Record<string, unknown>,
    model: input.model as unknown,
    checkpointer: new MemorySaver(),
    executor: input.executor,
  };
}

function build(
  model: ReturnType<typeof fakeModel>,
  executor: AiOrderingCartExecutor,
  overrides: {
    deadlineAt?: number;
    guestMessage?: string;
    validation?: AiOrderingValidationInput;
  } = {},
) {
  let sequence = 0;

  return createAiOrderingAgent({
    config: config!,
    context: assembledContext(),
    validation: {
      menu: AI_ORDERING_MENU_FIXTURE,
      cart: AI_ORDERING_CART_FIXTURE,
      participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
    },
    confirmationRequired: true,
    locale: 'zh-TW' as const,
    guestMessage: '請給我一碗白飯',
    newId: (prefix) => {
      sequence += 1;
      return `${prefix}-${String(sequence)}`;
    },
    toToolSchema: (schema) =>
      toGeminiToolSchema(schema as never) as Record<string, unknown>,
    model: model as unknown,
    checkpointer: new MemorySaver(),
    executor,
    ...overrides,
  });
}

function executor(overrides: Partial<AiOrderingCartExecutor> = {}) {
  return {
    addItem: vi.fn(async () => undefined),
    updateItem: vi.fn(async () => undefined),
    removeItem: vi.fn(async () => undefined),
    ...overrides,
  };
}

const threadConfig = { configurable: { thread_id: 'proposal-under-test' } };

/**
 * The tool names bound for each model call, in call order.
 *
 * Read from `bindTools` because the fake model records messages and options per
 * call but not the tools: they are bound before the call, not passed with it.
 */
function boundToolNames(bind: { mock: { calls: unknown[][] } }): string[][] {
  return bind.mock.calls.map(([tools]) =>
    (tools as { name?: string }[]).map((candidate) => candidate.name ?? ''),
  );
}

describe('AI ordering agent run', () => {
  let cart: ReturnType<typeof executor>;

  beforeEach(() => {
    cart = executor();
  });

  it('pauses on a proposal without touching the cart', async () => {
    const model = fakeModel().respondWithTools([proposalCall()]);
    const { agent, record, messages } = build(model, cart);

    const result = await agent.invoke({ messages }, threadConfig);

    // Paused, not finished: the guest has not decided yet.
    expect(result.__interrupt__).toBeDefined();
    // Nothing executed. The proposal is still only a proposal.
    expect(cart.addItem).not.toHaveBeenCalled();
    expect(record.response?.type).toBe('proposal');
    expect(record.modelCalls).toBe(1);
  });

  it('gives the proposal backend-issued ids the model never emitted', async () => {
    const model = fakeModel().respondWithTools([proposalCall()]);
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    const response = record.response;

    expect(response?.type).toBe('proposal');

    if (response?.type !== 'proposal') return;

    // The model is not allowed to emit these, but the execution and the guest's
    // edit both work on them.
    expect(response.proposalId).toMatch(/^proposal-/);
    expect(response.operations[0]?.operationId).toBe('op-1');
    expect(response.confirmationRequired).toBe(true);
  });

  it('executes once on approval and lets the model answer what happened', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall()])
      .respond(new AIMessage('Added one steamed rice.'));
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);
    await agent.invoke(
      new Command({ resume: { decisions: [{ type: 'approve' }] } }),
      threadConfig,
    );

    expect(cart.addItem).toHaveBeenCalledTimes(1);
    expect(record.results).toEqual([
      { operationId: 'op-1', outcome: 'accepted' },
    ]);
    // One planning call, one closing call. The closing one is the feature: the
    // assistant speaks to the outcome in the same exchange.
    expect(record.modelCalls).toBe(2);
    expect(record.phase).toBe('closing');
  });

  it('binds no tools on the closing call, so a decided run cannot propose again', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall()])
      .respond(new AIMessage('Added one steamed rice.'));
    const bind = vi.spyOn(model, 'bindTools');
    const { agent, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);
    await agent.invoke(
      new Command({ resume: { decisions: [{ type: 'approve' }] } }),
      threadConfig,
    );

    expect(model.calls).toHaveLength(2);
    // Tools are bound before a call, not passed with it, so the binding is
    // what is checked: the planning call bound them, the closing call none.
    expect(boundToolNames(bind).filter((names) => names.length > 0)).toEqual([
      ['propose_cart_operations', 'ask_choices', 'report_unanswerable'],
    ]);
  });

  it('executes only the operations the guest kept', async () => {
    const model = fakeModel()
      .respondWithTools([
        {
          name: 'propose_cart_operations',
          args: {
            reply: 'I can add both.',
            operations: [
              {
                type: 'add_item',
                summary: 'Add rice',
                item: { productId: 'prod-rice', quantity: 1 },
              },
              {
                type: 'add_item',
                summary: 'Add more rice',
                item: { productId: 'prod-rice', quantity: 2 },
              },
            ],
          },
          id: 'call_1',
        },
      ])
      .respond(new AIMessage('Added the first one.'));
    const { agent, record, messages } = build(model, cart);

    const paused = await agent.invoke({ messages }, threadConfig);
    const response = record.response;

    expect(paused.__interrupt__).toBeDefined();

    if (response?.type !== 'proposal') throw new Error('expected a proposal');

    const kept = response.operations.slice(0, 1);

    await agent.invoke(
      new Command({
        resume: {
          decisions: [
            {
              type: 'edit',
              editedAction: {
                name: 'propose_cart_operations',
                args: { ...response, operations: kept },
              },
            },
          ],
        },
      }),
      threadConfig,
    );

    // Dismissing one operation is an edit of this call's arguments, not a
    // separate decision per operation.
    expect(cart.addItem).toHaveBeenCalledTimes(1);
    expect(record.results).toEqual([
      { operationId: kept[0]!.operationId, outcome: 'accepted' },
    ]);
  });

  it('never turns a question into an interrupt', async () => {
    const model = fakeModel().respondWithTools([
      {
        name: 'ask_choices',
        args: {
          reply: 'Sure.',
          question: 'How sweet would you like it?',
          inputMode: 'single_choice',
          options: [{ label: '半糖' }, { label: '無糖' }],
        },
        id: 'call_1',
      },
    ]);
    const { agent, record, messages } = build(model, cart);

    const result = await agent.invoke({ messages }, threadConfig);

    // `ask_choices` has nothing to execute. Letting it reach a tool node would
    // feed a result back and call the model a second time for no reason.
    expect(result.__interrupt__).toBeUndefined();
    expect(record.response?.type).toBe('choices');
    expect(record.modelCalls).toBe(1);
  });

  it('lets the model explain, without the proposal tool, once two proposals failed', async () => {
    const model = fakeModel()
      // Both attempts name a product that is not on the menu.
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall('prod-still-not-real')])
      .respond(new AIMessage('We do not have that one. Something else?'));
    const bind = vi.spyOn(model, 'bindTools');
    const { agent, record, messages } = build(model, cart);

    const result = await agent.invoke({ messages }, threadConfig);

    expect(result.__interrupt__).toBeUndefined();
    expect(record.modelCalls).toBe(3);
    // The model's own words, written knowing nothing was proposed — so they are
    // in the guest's language and say what actually went wrong.
    expect(record.response).toEqual({
      type: 'message',
      reply: 'We do not have that one. Something else?',
    });

    // Unbound, not forbidden in prose: a change that fails for a reason the
    // model cannot fix would fail a third time the same way.
    const bound = boundToolNames(bind);

    expect(bound).toHaveLength(3);
    expect(bound[1]).toContain('propose_cart_operations');
    expect(bound[2]).not.toContain('propose_cart_operations');
    expect(bound[2]).toContain('ask_choices');
  });

  it('tells the final attempt why nothing could be applied', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall('prod-still-not-real')])
      .respond(new AIMessage('We do not have that one.'));
    const { agent, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    const finalMessages = model.calls[2]?.messages ?? [];
    const last = String(finalMessages.at(-1)?.content);

    expect(last).toContain('None of the changes you proposed can be applied');
    expect(last).toContain('can no longer propose');
    // Both notes, in order, after the prefix the earlier attempts cached.
    expect(String(finalMessages.at(-2)?.content)).toContain(
      'cannot be applied',
    );
    expect(String(finalMessages[0]?.content)).toContain('SYSTEM:');
  });

  it('ignores a proposal the final attempt makes without the tool', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall('prod-still-not-real')])
      .respondWithTools([proposalCall()]);
    const { agent, record, messages } = build(model, cart);

    const result = await agent.invoke({ messages }, threadConfig);

    expect(result.__interrupt__).toBeUndefined();
    expect(record.response).toEqual({
      type: 'message',
      reply: AI_ORDERING_EMPTY_PROPOSAL_REPLY['zh-TW'],
    });
  });

  it('answers a failed explanation in the language the guest wrote in', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall('prod-still-not-real')])
      // An empty reply: nothing the gate can use.
      .respond(new AIMessage(''));
    const { agent, record, messages } = build(model, cart, {
      guestMessage: 'one steamed rice please',
    });

    await agent.invoke({ messages }, threadConfig);

    // The store's locale here is zh-TW. The guest wrote in English, and this
    // line is the only thing they read this turn.
    expect(record.response).toEqual({
      type: 'message',
      reply: AI_ORDERING_EMPTY_PROPOSAL_REPLY.en,
    });
  });

  it('never turns an invalid proposal into an interrupt', async () => {
    const model = fakeModel()
      // Every attempt is unusable: two bad proposals, then an empty reply.
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall('prod-still-not-real')])
      .respond(new AIMessage(''));
    const { agent, record, messages } = build(model, cart);

    const result = await agent.invoke({ messages }, threadConfig);

    // Validation runs before anything can become an interrupt, so the guest is
    // never shown an Apply button for a change that cannot be applied.
    expect(result.__interrupt__).toBeUndefined();
    expect(cart.addItem).not.toHaveBeenCalled();
    // Not the model's reply either. It said "I can add that." about a change
    // that no longer exists, and showing it would promise the guest a list that
    // is not there — and leave that promise in the history for the next turn.
    expect(record.response).toEqual({
      type: 'message',
      reply: AI_ORDERING_EMPTY_PROPOSAL_REPLY['zh-TW'],
    });
    // What the model actually said is kept for review, not discarded.
    expect(JSON.stringify(record.modelOutput)).toContain('I can add that.');
  });

  it('stops at the first attempt that needs no repair', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall()]);
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    expect(record.modelCalls).toBe(2);
    expect(record.quality.repairAttempted).toBe(true);
    expect(record.quality.repairSucceeded).toBe(true);
    expect(record.response?.type).toBe('proposal');
  });

  it('tells the model what was wrong, after the cached prefix', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall()]);
    const { agent, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    const repairMessages = model.calls[1]?.messages ?? [];
    const last = repairMessages.at(-1);

    // Appended LAST, so the prefix the first attempt established — and the
    // provider cached — is left intact.
    expect(String(last?.content)).toContain('cannot be applied');
    expect(String(repairMessages[0]?.content)).toContain('SYSTEM:');

    // Sent back as the failed call's own error result, after the call itself,
    // so the model corrects a call it can see rather than one it cannot.
    expect(last?.getType()).toBe('tool');
    expect((last as { status?: string }).status).toBe('error');
    expect(repairMessages.at(-2)?.getType()).toBe('ai');
  });

  it('keeps the assembled block order the provider cache depends on', async () => {
    const model = fakeModel().respondWithTools([proposalCall()]);
    const { agent, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    const sent = (model.calls[0]?.messages ?? []).map((message) =>
      String(message.content),
    );

    expect(sent.slice(0, 4)).toEqual([
      'SYSTEM: you are an ordering assistant',
      'MENU: steamed rice',
      'CART: empty',
      'GUEST: one steamed rice please',
    ]);
  });
  it('records how many operations validation dropped', async () => {
    const model = fakeModel()
      .respondWithTools([
        {
          name: 'propose_cart_operations',
          args: {
            reply: 'I can add one of those.',
            operations: [
              {
                type: 'add_item',
                summary: 'Add rice',
                item: { productId: 'prod-rice', quantity: 1 },
              },
              {
                type: 'add_item',
                summary: 'Add a ghost',
                item: { productId: 'prod-does-not-exist', quantity: 1 },
              },
            ],
          },
          id: 'call_1',
        },
      ])
      .respondWithTools([
        {
          name: 'propose_cart_operations',
          args: {
            reply: 'I can add one of those.',
            operations: [
              {
                type: 'add_item',
                summary: 'Add rice',
                item: { productId: 'prod-rice', quantity: 1 },
              },
              {
                type: 'add_item',
                summary: 'Add a ghost',
                item: { productId: 'prod-does-not-exist', quantity: 1 },
              },
            ],
          },
          id: 'call_2',
        },
      ]);
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    // A version that drops operations often is a worse version, and that is
    // only visible in aggregate across the corpus.
    expect(record.quality.droppedOperationCount).toBe(1);
    expect(record.quality.repairAttempted).toBe(true);
    expect(record.quality.repairSucceeded).toBe(false);
  });

  it('counts operations aimed at another participant item', async () => {
    const model = fakeModel()
      .respondWithTools([
        {
          name: 'propose_cart_operations',
          args: {
            reply: 'Removing that.',
            operations: [
              {
                type: 'remove_own_item',
                summary: 'Remove it',
                itemId: AI_ORDERING_CART_FIXTURE.items.find(
                  (item) =>
                    item.addedByParticipantId !==
                    AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
                )?.id,
              },
            ],
          },
          id: 'call_1',
        },
      ])
      .respondWithTools([
        {
          name: 'propose_cart_operations',
          args: {
            reply: 'Adding rice instead.',
            operations: [
              {
                type: 'add_item',
                summary: 'Add rice',
                item: { productId: 'prod-rice', quantity: 1 },
              },
            ],
          },
          id: 'call_2',
        },
      ]);
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    // A prompt-quality signal: the model was told whose items it may touch.
    expect(record.quality.ownershipViolationCount).toBe(1);
  });

  it('records the provider cached-prompt count', async () => {
    const model = fakeModel().respondWithTools([proposalCall()]);
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    // Zero from a fake provider, but the field has to survive the agent: it is
    // the only evidence the volatility-ordered prompt layout earns its keep.
    expect(record.cacheReadTokens).toBe(0);
  });
  it('clamps every provider call, including the repair, to the turn budget', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('prod-does-not-exist')])
      .respondWithTools([proposalCall()]);
    const { agent, messages } = build(model, cart, {
      deadlineAt: Date.now() + 60_000,
    });

    await agent.invoke({ messages }, threadConfig);

    expect(model.calls).toHaveLength(2);

    for (const call of model.calls) {
      // Every call carries one, the repair included: a correction that starts
      // late must not be handed a fresh timeout.
      expect((call.options as { signal?: AbortSignal }).signal).toBeInstanceOf(
        AbortSignal,
      );
    }
  });

  it('clamps the closing call after an execution too', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall()])
      .respond(new AIMessage('Added one steamed rice.'));
    const { agent, messages } = build(model, cart, {
      deadlineAt: Date.now() + 60_000,
    });

    await agent.invoke({ messages }, threadConfig);
    await agent.invoke(
      new Command({ resume: { decisions: [{ type: 'approve' }] } }),
      threadConfig,
    );

    expect(
      (model.calls.at(-1)?.options as { signal?: AbortSignal }).signal,
    ).toBeInstanceOf(AbortSignal);
  });
  it('labels a proposal from the operation, not from anything the model said', async () => {
    const model = fakeModel().respondWithTools([
      {
        name: 'propose_cart_operations',
        args: {
          reply: 'I will add a note about chilli.',
          operations: [
            {
              type: 'add_item',
              // The model cannot author a label, so this is the whole claim it
              // can make — and the label below is built from it, not from the
              // reply above.
              item: { productId: 'prod-rice', quantity: 1 },
            },
          ],
        },
        id: 'call_1',
      },
    ]);
    const { agent, record, messages } = build(model, cart);

    await agent.invoke({ messages }, threadConfig);

    const response = record.response;

    if (response?.type !== 'proposal') throw new Error('expected a proposal');

    expect(response.operations[0]?.summary).toBe('+ 白飯 ×1');
  });
});

describe('AI ordering short codes in a run', () => {
  const RICE_ID = 'product-1a2b3c4d-0000-4000-8000-000000000001';

  // The fixture menu, with the rice given a real-shaped id so it has a code.
  const validation: AiOrderingValidationInput = {
    menu: JSON.parse(
      JSON.stringify(AI_ORDERING_MENU_FIXTURE).replaceAll('prod-rice', RICE_ID),
    ) as typeof AI_ORDERING_MENU_FIXTURE,
    cart: AI_ORDERING_CART_FIXTURE,
    participantId: AI_ORDERING_FIXTURE_PARTICIPANT_SELF,
  };

  it('turns the code the model wrote back into the id before anything uses it', async () => {
    const model = fakeModel().respondWithTools([proposalCall('1a2b3c4d')]);
    const { agent, record, messages } = build(model, executor(), {
      validation,
    });

    await agent.invoke({ messages }, threadConfig);

    // The guest, the cart and the stored proposal all get the real id. Nothing
    // past the output gate knows a code existed.
    expect(record.response).toMatchObject({
      type: 'proposal',
      operations: [{ type: 'add_item', item: { productId: RICE_ID } }],
    });
  });

  it('rejects a code that matches nothing, like any unknown id', async () => {
    const model = fakeModel()
      .respondWithTools([proposalCall('deadbeef')])
      .respondWithTools([proposalCall('1a2b3c4d')]);
    const { agent, record, messages } = build(model, executor(), {
      validation,
    });

    await agent.invoke({ messages }, threadConfig);

    // A derived code points at one id or at nothing. "Nothing" is caught here
    // and repaired, which a renumbered code pointing elsewhere would not be.
    expect(String(model.calls[1]?.messages.at(-1)?.content)).toContain(
      'no product "deadbeef"',
    );
    expect(record.response?.type).toBe('proposal');
  });
});

describe('AI ordering call budget', () => {
  it('gives a call the version timeout when the turn has no deadline', () => {
    expect(nextAiOrderingCallTimeoutMs(config!, undefined)).toBe(
      config!.timeoutMs,
    );
  });

  it('gives a call nothing once the turn budget is spent', () => {
    // Not a negative timeout and not the full one: a call starting after the
    // deadline gets zero, so the turn's duration stays a guarantee.
    expect(nextAiOrderingCallTimeoutMs(config!, Date.now() - 1000)).toBe(0);
  });

  it('gives a call only what is left when the budget is nearly spent', () => {
    const remaining = nextAiOrderingCallTimeoutMs(config!, Date.now() + 50);

    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(50);
  });
});

describe('AI ordering resume across agent instances', () => {
  it('executes when a DIFFERENT instance resumes the paused run', async () => {
    // Production never resumes with the object that paused: the decision is a
    // separate request that rebuilds the agent. The checkpoint is the only thing
    // carried between them, so this is the shape that actually ships.
    const checkpointer = new MemorySaver();
    const cart = executor();
    const config = { configurable: { thread_id: 'proposal-across' } };

    const planning = createAiOrderingAgent({
      ...agentInput({
        model: fakeModel().respondWithTools([proposalCall()]),
        executor: cart,
      }),
      checkpointer,
    });

    const paused = await planning.agent.invoke(
      { messages: planning.messages },
      config,
    );

    expect(paused.__interrupt__).toBeDefined();

    const response = planning.record.response;

    if (response?.type !== 'proposal') throw new Error('expected a proposal');

    const resuming = createAiOrderingAgent({
      ...agentInput({
        model: fakeModel().respond(new AIMessage('Added one steamed rice.')),
        executor: cart,
      }),
      checkpointer,
    });

    await resuming.agent.invoke(
      new Command({
        resume: {
          decisions: [
            {
              type: 'edit',
              editedAction: {
                name: 'propose_cart_operations',
                args: { ...response, operations: response.operations },
              },
            },
          ],
        },
      }),
      config,
    );

    expect(cart.addItem).toHaveBeenCalledTimes(1);
    expect(resuming.record.results).toEqual([
      { operationId: 'op-1', outcome: 'accepted' },
    ]);
  });

  it('does not execute when the edited call is missing its other arguments', async () => {
    // The defect this test exists for: sending only `operations` leaves the tool
    // call incomplete, and the interrupt drops it WITHOUT AN ERROR — the cart
    // silently does not change. So the resume rebuilds the whole call from the
    // stored proposal, and this pins why.
    const checkpointer = new MemorySaver();
    const cart = executor();
    const config = { configurable: { thread_id: 'proposal-partial' } };

    const planning = createAiOrderingAgent({
      ...agentInput({
        model: fakeModel().respondWithTools([proposalCall()]),
        executor: cart,
      }),
      checkpointer,
    });

    await planning.agent.invoke({ messages: planning.messages }, config);

    const response = planning.record.response;

    if (response?.type !== 'proposal') throw new Error('expected a proposal');

    const resuming = createAiOrderingAgent({
      ...agentInput({
        model: fakeModel().respond(new AIMessage('Done.')),
        executor: cart,
      }),
      checkpointer,
    });

    await resuming.agent.invoke(
      new Command({
        resume: {
          decisions: [
            {
              type: 'edit',
              editedAction: {
                name: 'propose_cart_operations',
                args: { operations: response.operations },
              },
            },
          ],
        },
      }),
      config,
    );

    expect(cart.addItem).not.toHaveBeenCalled();
  });
});
