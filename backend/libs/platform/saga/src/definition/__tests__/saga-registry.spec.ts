import { Compensation, defineOperation } from '@contracts/platform';
import { OperationResolver } from '@platform/internal-api';
import { z } from 'zod';
import { SagaError } from '../../errors/saga-error.js';
import { SagaErrorCode } from '../../errors/saga-error-code.enum.js';
import { SagaDefinition } from '../saga-definition.js';
import type { SagaFlow } from '../saga-flow.js';
import { SagaDefinitionIssueCode } from '../saga-definition-issue-code.enum.js';
import { SagaRegistry } from '../saga-registry.js';

const CREATE = defineOperation({
  id: 'a.item.create.v1',
  input: z.object({ name: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'a.item.remove.v1',
  description: 'Creates an a.',
});
const REMOVE = defineOperation({
  id: 'a.item.remove.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ removed: z.boolean() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Removing is not undone.',
  description: 'Removes an a.',
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
const UNDOABLE = defineOperation({
  id: 'a.item.create-final.v1',
  input: z.unknown(),
  output: z.unknown(),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Nothing undoes it.',
  description: 'Creates an a for good.',
});

class Good extends SagaDefinition<unknown> {
  readonly type = 'good';

  protected define(flow: SagaFlow<unknown>): void {
    flow.step(CREATE).pivot().step(SEND);
  }
}

class Other extends SagaDefinition<unknown> {
  readonly type = 'other';

  protected define(flow: SagaFlow<unknown>): void {
    flow.step(CREATE).pivot().step(REMOVE);
  }
}

class Empty extends SagaDefinition<unknown> {
  readonly type = 'empty';

  protected define(): void {
    // no steps
  }
}

class Duplicate extends SagaDefinition<unknown> {
  readonly type = 'good';

  protected define(flow: SagaFlow<unknown>): void {
    flow.step(CREATE).pivot().step(SEND);
  }
}

class Unfinished extends SagaDefinition<unknown> {
  readonly type = 'unfinished';

  protected define(flow: SagaFlow<unknown>): void {
    flow.step(UNDOABLE).step(CREATE);
  }
}

function errorOf(fn: () => unknown): SagaError | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof SagaError ? error : undefined;
  }
  return undefined;
}

const resolver = new OperationResolver();

function registry(): SagaRegistry {
  return new SagaRegistry({ resolver, maxStepDurationMs: 25_000 });
}

describe('SagaRegistry', () => {
  it('compiles every saga on seal, not only the first of each type', () => {
    const sagas = registry();
    sagas.add(new Good(), new Empty());

    const error = errorOf(() => sagas.seal());

    expect(error?.code).toBe(SagaErrorCode.InvalidDefinition);
  });

  it('seals, compiles and returns the saga by its type', () => {
    const sagas = registry();
    sagas.add(new Good(), new Other());

    expect(sagas.get('good').type).toBe('good');
    expect(sagas.get('other').pivotIndex).toBe(1);
  });

  it('rejects a repeated type with InvalidDefinition and the TypeMismatch code', () => {
    const sagas = registry();
    sagas.add(new Good(), new Duplicate());

    const error = errorOf(() => sagas.seal());

    expect(error?.code).toBe(SagaErrorCode.InvalidDefinition);
    expect(error?.details).toMatchObject({
      code: SagaDefinitionIssueCode.TypeMismatch,
    });
  });

  it('does not accept a registration after sealing', () => {
    const sagas = registry();
    sagas.add(new Good());
    sagas.seal();

    const error = errorOf(() => sagas.add(new Other()));

    expect(error).toBeInstanceOf(SagaError);
    expect(error?.code).toBe(SagaErrorCode.InvalidConfiguration);
  });

  it('seal is idempotent: a second call does not recompile or change the sagas', () => {
    const sagas = registry();
    sagas.add(new Good());
    sagas.seal();
    const first = sagas.get('good');

    expect(() => sagas.seal()).not.toThrow();
    expect(sagas.get('good')).toBe(first);
  });

  it('an invalid definition fails on seal with InvalidDefinition and the list of problems', () => {
    const sagas = registry();
    sagas.add(new Good(), new Unfinished());

    const error = errorOf(() => sagas.seal());

    expect(error?.code).toBe(SagaErrorCode.MissingCompensation);
  });

  it('get of an unregistered type gives UnknownDefinition', () => {
    const sagas = registry();
    sagas.add(new Good());

    expect(errorOf(() => sagas.get('nope'))?.code).toBe(
      SagaErrorCode.UnknownDefinition,
    );
  });

  it('typeOf returns the type of a registered class and fails with another', () => {
    const sagas = registry();
    sagas.add(new Good());

    expect(sagas.typeOf(Good)).toBe('good');
    expect(errorOf(() => sagas.typeOf(Other))?.code).toBe(
      SagaErrorCode.UnknownDefinition,
    );
  });
});
