import { Compensation, defineOperation } from '@contracts/platform';
import { OperationResolver } from '@platform/internal-api';
import { z } from 'zod';
import { SagaError } from '../../errors/saga-error.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { StepStatus } from '../../model/step-status.enum.js';
import { SagaFlow } from '../saga-flow.js';

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
const UNDOABLE_A = defineOperation({
  id: 'a.item.create-final.v1',
  input: z.unknown(),
  output: z.unknown(),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Nothing undoes it.',
  description: 'Creates an a for good.',
});
const RESERVE = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: 'stock.release.v1',
  description: 'Reserves stock.',
});
const LOOKUP = defineOperation({
  id: 'stock.lookup.v1',
  input: z.object({ sku: z.string() }),
  output: z.object({ price: z.number() }),
  idempotent: true,
  mutating: false,
  description: 'Reads a price.',
});
const SHIP = defineOperation({
  id: 'stock.ship.v1',
  input: z.object({ reservationId: z.string() }),
  output: z.object({ shipmentId: z.string() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'A shipment cannot be recalled.',
  description: 'Ships.',
});
const EMAIL = defineOperation({
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

/** Code of the thrown error, or `undefined` if it did not throw. */
function codeOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return (error as { code?: unknown }).code;
  }
  return undefined;
}

describe('SagaFlow', () => {
  const resolver = new OperationResolver();

  it('compiles the steps, the pivot and the compensation operations', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow
      .step(CREATE_A)
      .input(() => ({ name: 'a' }))
      .step(CREATE_B)
      .pivot()
      .step(SEND);

    const compiled = flow.compile('valid');

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
    expect(compiled.steps.map((s) => s.afterPivot)).toEqual([
      false,
      false,
      true,
    ]);
  });

  it('uses the recorded forward input as the default compensation input', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(CREATE_A).input(() => ({ name: 'x' }));

    const [step] = flow.compile('default-compensation').steps;

    expect(
      step?.compensationInput(
        { sku: 'k' },
        {
          input: { name: 'x' },
          output: undefined,
          idempotencyKey: 'k',
          status: StepStatus.Dispatched,
        },
      ),
    ).toEqual({ name: 'x' });
  });

  it('the default input of a step is undefined', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(CREATE_B);

    const [step] = flow.compile('no-input').steps;

    expect(step?.input({ sku: 'x' })).toBeUndefined();
  });

  it('rejects a step before the pivot without compensation', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(UNDOABLE_A).step(CREATE_B);

    expect(codeOf(() => flow.compile('missing-compensation'))).toBe(
      SagaErrorCode.MissingCompensation,
    );
  });

  it('accepts a step without compensation after the pivot', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(CREATE_A).pivot().step(SEND);

    expect(() => flow.compile('post-pivot')).not.toThrow();
  });

  it('rejects a saga with no steps', () => {
    const flow = new SagaFlow<Order>(resolver);

    expect(() => flow.compile('empty')).toThrow(SagaError);
    expect(codeOf(() => flow.compile('empty'))).toBe(
      SagaErrorCode.InvalidDefinition,
    );
  });

  it('rejects a second pivot', () => {
    const flow = new SagaFlow<Order>(resolver);

    expect(() => flow.step(CREATE_A).pivot().pivot()).toThrow(SagaError);
    expect(codeOf(() => flow.step(CREATE_A).pivot())).toBe(
      SagaErrorCode.InvalidDefinition,
    );
  });

  it('takes the compensation from compensatedBy and the types from the schemas', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow
      .step(RESERVE)
      .input((s) => ({ sku: s.sku }))
      .onSuccess((s, out) => {
        s.reservationId = out.reservationId;
      })
      .pivot()
      .step(SHIP)
      .input((s) => ({ reservationId: s.reservationId ?? '' }));

    const compiled = flow.compile('order');

    expect(compiled.steps.map((s) => s.compensationOperationId)).toEqual([
      'stock.release.v1',
      null,
    ]);
    expect(compiled.steps[0]?.definition).toBe(RESERVE);
  });

  it('rejects an operation with Compensation.None before the pivot', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(SHIP);

    expect(codeOf(() => flow.compile('order'))).toBe(
      SagaErrorCode.MissingCompensation,
    );
  });

  it('accepts a read-only operation before the pivot, with nothing to compensate', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow
      .step(LOOKUP)
      .onSuccess((s, out) => {
        s.price = out.price;
      })
      .step(RESERVE);

    const compiled = flow.compile('order');

    expect(compiled.steps[0]?.compensationOperationId).toBeNull();
    expect(compiled.steps[0]?.afterPivot).toBe(false);
  });

  it('rejects a non-idempotent operation after the pivot', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(RESERVE).pivot().step(EMAIL);

    expect(codeOf(() => flow.compile('order'))).toBe(
      SagaErrorCode.InvalidDefinition,
    );
  });

  it('compile does not mutate the flow and can be repeated', () => {
    const flow = new SagaFlow<Order>(resolver);
    flow.step(CREATE_A).pivot().step(SEND);

    const first = flow.compile('repeatable');
    const second = flow.compile('repeatable');

    expect(second.steps.map((s) => s.operationId)).toEqual(
      first.steps.map((s) => s.operationId),
    );
  });
});
