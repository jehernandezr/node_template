import { Compensation, defineOperation } from '@contracts/platform';
import { z } from 'zod';
import { SagaError, SagaErrorCode } from '../errors.js';
import { StepStatus } from '../model.js';
import { SagaDefinition } from './saga-definition.js';
import { OperationRef, SagaFlow } from './saga-flow.js';

const CREATE_A: OperationRef<{ name: string }, { id: string }> = {
  id: 'a.create',
  compensatedBy: 'a.remove',
};
const CREATE_B: OperationRef = { id: 'b.create', compensatedBy: 'b.remove' };
const SEND: OperationRef = { id: 'post.send', compensatedBy: null };

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
  it('compiles steps, the pivot boundary and the compensation operations', () => {
    const compiled = new ValidSaga().build();

    expect(compiled.type).toBe('valid');
    expect(compiled.pivotIndex).toBe(2);
    expect(compiled.steps.map((s) => s.operationId)).toEqual([
      'a.create',
      'b.create',
      'post.send',
    ]);
    expect(compiled.steps.map((s) => s.compensationOperationId)).toEqual([
      'a.remove',
      'b.remove',
      null,
    ]);
    expect(compiled.steps[2].afterPivot).toBe(true);
    expect(compiled.steps[1].input({})).toBeUndefined();
  });

  it('defaults the compensation input to the logged forward input', () => {
    class Saga extends SagaDefinition<State> {
      readonly type = 'default-compensation';

      protected define(flow: SagaFlow<State>): void {
        flow.step(CREATE_A).input(() => ({ name: 'x' }));
      }
    }
    const step = new Saga().build().steps[0];

    expect(
      step.compensationInput(
        {},
        {
          input: { name: 'x' },
          output: undefined,
          idempotencyKey: 'k',
          status: StepStatus.Dispatched,
        },
      ),
    ).toEqual({ name: 'x' });
  });

  it('rejects a step before the pivot without compensation', () => {
    class Saga extends SagaDefinition<State> {
      readonly type = 'missing-compensation';

      protected define(flow: SagaFlow<State>): void {
        flow.step({ id: 'a.create', compensatedBy: null }).step(CREATE_B);
      }
    }

    expect(codeOf(() => new Saga().build())).toBe(
      SagaErrorCode.MissingCompensation,
    );
  });

  it('accepts a step without compensation after the pivot', () => {
    class Saga extends SagaDefinition<State> {
      readonly type = 'post-pivot';

      protected define(flow: SagaFlow<State>): void {
        flow.step(CREATE_A).pivot().step(SEND);
      }
    }

    expect(() => new Saga().build()).not.toThrow();
  });

  it('rejects a saga without steps', () => {
    class Saga extends SagaDefinition<State> {
      readonly type = 'empty';

      protected define(): void {
        // no steps
      }
    }

    expect(() => new Saga().build()).toThrow(SagaError);
  });

  it('rejects a second pivot', () => {
    class TwoPivots extends SagaDefinition<State> {
      readonly type = 'two-pivots';

      protected define(flow: SagaFlow<State>): void {
        flow.step(CREATE_A).pivot().pivot();
      }
    }

    expect(codeOf(() => new TwoPivots().build())).toBe(
      SagaErrorCode.InvalidDefinition,
    );
  });
});

describe('SagaFlow with contract definitions', () => {
  const Reserve = defineOperation({
    id: 'stock.reserve.v1',
    input: z.object({ sku: z.string() }),
    output: z.object({ reservationId: z.string() }),
    idempotent: true,
    compensatedBy: 'stock.release.v1',
    description: 'Reserves stock.',
  });
  const Lookup = defineOperation({
    id: 'stock.lookup.v1',
    input: z.object({ sku: z.string() }),
    output: z.object({ price: z.number() }),
    idempotent: true,
    mutating: false,
    description: 'Reads a price.',
  });
  const Ship = defineOperation({
    id: 'stock.ship.v1',
    input: z.object({ reservationId: z.string() }),
    output: z.object({ shipmentId: z.string() }),
    idempotent: true,
    compensatedBy: Compensation.None,
    compensationReason: 'A shipment cannot be recalled.',
    description: 'Ships.',
  });
  const Email = defineOperation({
    id: 'mail.send.v1',
    input: z.object({ to: z.string() }),
    output: z.object({ sent: z.boolean() }),
    idempotent: false,
    compensatedBy: Compensation.None,
    compensationReason: 'An email cannot be unsent.',
    description: 'Sends an email.',
  });

  interface Order {
    sku: string;
    reservationId?: string;
    price?: number;
  }

  function compile(define: (flow: SagaFlow<Order>) => void) {
    class Saga extends SagaDefinition<Order> {
      readonly type = 'order';

      protected define(flow: SagaFlow<Order>): void {
        define(flow);
      }
    }
    return new Saga().build();
  }

  it('takes the compensation from compensatedBy and the types from the schemas', () => {
    const compiled = compile((flow) =>
      flow
        .step(Reserve)
        .input((s) => ({ sku: s.sku }))
        .onSuccess((s, out) => {
          s.reservationId = out.reservationId;
        })
        .pivot()
        .step(Ship)
        .input((s) => ({ reservationId: s.reservationId ?? '' })),
    );

    expect(compiled.steps.map((s) => s.compensationOperationId)).toEqual([
      'stock.release.v1',
      null,
    ]);
    expect(compiled.steps[0]?.definition).toBe(Reserve);
  });

  it('rejects an operation with Compensation.None before the pivot', () => {
    expect(codeOf(() => compile((flow) => flow.step(Ship)))).toBe(
      SagaErrorCode.MissingCompensation,
    );
  });

  it('accepts a read-only operation before the pivot, with nothing to compensate', () => {
    const compiled = compile((flow) =>
      flow
        .step(Lookup)
        .onSuccess((s, out) => {
          s.price = out.price;
        })
        .step(Reserve),
    );

    expect(compiled.steps[0]?.compensationOperationId).toBeNull();
    expect(compiled.steps[0]?.afterPivot).toBe(false);
  });

  it('rejects an operation that is not idempotent after the pivot', () => {
    expect(
      codeOf(() => compile((flow) => flow.step(Reserve).pivot().step(Email))),
    ).toBe(SagaErrorCode.InvalidDefinition);
  });

  it('treats Compensation.None in a hand-written reference as no compensation', () => {
    expect(
      codeOf(() =>
        compile((flow) =>
          flow.step({ id: 'stock.ship.v1', compensatedBy: Compensation.None }),
        ),
      ),
    ).toBe(SagaErrorCode.MissingCompensation);
  });
});
