import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import { describe, expect, it } from 'vitest';

import {
  createAiOrderingDebugTrace,
  renderAiOrderingModelCallTrace,
} from '../src/modules/aiOrdering/runtime/debugTrace.js';

describe('AI ordering debug trace', () => {
  it('is off unless a directory is configured', () => {
    expect(createAiOrderingDebugTrace('turn-1')).toBeUndefined();
  });

  it('shows the prompt, the tools bound, an earlier tool error and the answer', () => {
    const failedCall = new AIMessage({
      content: '',
      tool_calls: [
        { id: 'call-1', name: 'propose_cart_operations', args: { a: 1 } },
      ],
    });

    const text = renderAiOrderingModelCallTrace({
      callNumber: 2,
      toolNames: ['propose_cart_operations', 'ask_choices'],
      messages: [
        new HumanMessage('## Menu'),
        failedCall,
        new ToolMessage({
          content: 'the guest has not chosen modifier "ab12cd34"',
          tool_call_id: 'call-1',
          name: 'propose_cart_operations',
          status: 'error',
        }),
      ],
      output: new AIMessage('Which ice level?'),
    });

    expect(text).toContain(
      'model call 2 — tools bound: propose_cart_operations, ask_choices',
    );
    expect(text).toContain('---- [human]\n## Menu');
    expect(text).toContain(
      'tool call: propose_cart_operations\n{\n  "a": 1\n}',
    );
    expect(text).toContain('---- [tool error] propose_cart_operations');
    expect(text).toContain(
      '======== model answered\n---- [ai]\nWhich ice level?',
    );
  });

  it('says why a call produced no answer', () => {
    const text = renderAiOrderingModelCallTrace({
      callNumber: 1,
      toolNames: [],
      messages: [],
      error: new Error('429 Too Many Requests'),
    });

    expect(text).toContain('tools bound: (none)');
    expect(text).toContain('FAILED: 429 Too Many Requests');
  });
});
