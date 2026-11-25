import { Compensation, defineOperation } from '@contracts/platform';
import { OperationResolver } from '@platform/internal-api';
import { z } from 'zod';
import { SagaError } from '../../errors/saga-error.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import { SagaDefinition } from '../saga-definition.js';
import type { SagaFlow } from '../saga-flow.js';

const CREATE_A = defineOperation({
  id: 'a.item.create.v1',
  input: z.object({ name: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'a.item.remove.v1',
  description: 'Creates an a.',
});
const CREATE_B = defineOperation({
  id: 'b.item.create.v1',
  input: z.unknown(),
  output: z.unknown(),
  idempotent: true,
  compensatedBy: 'b.item.remove.v1',
  description: 'Creates a b.',
});
const SEND = defineOperation({
  id: 'post.item.send.v1',
  input: z.unknown(),
  output: z.unknown(),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'A sent post cannot be recalled.',
  description: 'Sends a post.',
});

interface State {
  a?: string;
  b?: string;
}

function codeOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

class ValidSaga extends SagaDefinition<State> {
  readonly type = 'valid';

  protected define(flow: SagaFlow<State>): void {
    flow
      .step(CREATE_A)
      .input(() => ({ name: 'a' }))
      .onSuccess((s, out) => {
        s.a = out.id;
      })
      .compensationInput((s) => ({ id: s.a }))
      .step(CREATE_B)
      .pivot()
      .step(SEND);
  }
}

describe('SagaDefinition.build', () => {
  const resolver = new OperationResolver();

  it('compiles the saga with its type, the pivot and the compensations', () => {
    const compiled = new ValidSaga().build(resolver);

    expect(compiled.type).toBe('valid');
    expect(compiled.pivotIndex).toBe(2);
    expect(compiled.steps.map((s) => s.operationId)).toEqual([
      'a.item.create.v1',
      'b.item.create.v1',
      'post.item.send.v1',
    ]);
    expect(compiled.steps.map((s) => s.compensationOperationId)).toEqual([
      'a.item.remove.v1',
      'b.item.remove.v1',
      null,
    ]);
    expect(compiled.steps[2]?.afterPivot).toBe(true);
  });

  it('computes the compensation input the step declares', () => {
    const compiled = new ValidSaga().build(resolver);

    expect(
      compiled.steps[0]?.compensationInput(
        { a: 'a-1' },
        {
          input: { name: 'a' },
          output: { id: 'a-1' },
          idempotencyKey: 'k',
          status: StepStatus.Succeeded,
        },
      ),
    ).toEqual({ id: 'a-1' });
  });

  it('builds a new compilation on each call', () => {
    const first = new ValidSaga().build(resolver);
    const second = new ValidSaga().build(resolver);

    expect(second.steps).toHaveLength(first.steps.length);
    expect(second).not.toBe(first);
  });

  it('rejects a saga with no steps with InvalidDefinition', () => {
    class Empty extends SagaDefinition<State> {
      readonly type = 'empty';

      protected define(): void {
        // no steps
      }
    }

    expect(() => new Empty().build(resolver)).toThrow(SagaError);
    expect(codeOf(() => new Empty().build(resolver))).toBe(
      SagaErrorCode.InvalidDefinition,
    );
  });

  it('rejects a step before the pivot without compensation with MissingCompensation', () => {
    const UNDOABLE = defineOperation({
      id: 'a.item.create-final.v1',
      input: z.unknown(),
      output: z.unknown(),
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason: 'Nothing undoes it.',
      description: 'Creates an a for good.',
    });
    class Saga extends SagaDefinition<State> {
      readonly type = 'missing-compensation';

      protected define(flow: SagaFlow<State>): void {
        flow.step(UNDOABLE).step(CREATE_B);
      }
    }

    expect(codeOf(() => new Saga().build(resolver))).toBe(
      SagaErrorCode.MissingCompensation,
    );
  });
});
