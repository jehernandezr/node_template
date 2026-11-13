import { defineOperation } from '@contracts/platform';
import { z } from 'zod';
import { Compensation, Operation, OperationContract } from './contract.js';
import { InternalApiError, InternalApiErrorCode } from './errors.js';
import { ContractRegistry, RegistryIssueCode } from './registry.js';

const schema = z.object({});

@Operation({
  id: 'a.reserve.v1',
  compensatedBy: 'a.release.v1',
  idempotent: true,
})
class Reserve extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({
  id: 'a.release.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Releasing is final',
  idempotent: true,
})
class Release extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({ id: 'a.read.v1', mutating: false, idempotent: true })
class Read extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({ id: 'a.create.v1', idempotent: true })
class CreateWithoutCompensation extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({
  id: 'a.orphan.v1',
  compensatedBy: 'a.missing.v1',
  idempotent: true,
})
class Orphan extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({
  id: 'a.reserve.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Duplicate',
  idempotent: true,
})
class ReserveDuplicate extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({
  id: 'a.slow.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Slow',
  idempotent: true,
  timeoutMs: 10_000,
})
class SlowIdempotent extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({
  id: 'a.slow-once.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Once',
  idempotent: false,
  timeoutMs: 30_000,
})
class SlowOnce extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

class Plain extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = schema;
}

@Operation({
  id: 'a.raw-date.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Dates',
  idempotent: true,
})
class RawDate extends OperationContract<object, object> {
  readonly input = schema;
  readonly output = z.object({ at: z.date() });
}

describe('ContractRegistry', () => {
  it('reports no issues for a valid registry', () => {
    const registry = new ContractRegistry();
    registry.register(Reserve, Release, Read);
    expect(registry.validate()).toEqual([]);
    expect(() => registry.assertValid()).not.toThrow();
  });

  it('reports duplicate ids', () => {
    const registry = new ContractRegistry();
    registry.register(Reserve, ReserveDuplicate, Release);
    const issues = registry.validate();
    expect(issues.map((issue) => issue.code)).toContain(
      RegistryIssueCode.DuplicateId,
    );
    expect(
      issues.find((issue) => issue.code === RegistryIssueCode.DuplicateId)
        ?.operationId,
    ).toBe('a.reserve.v1');
  });

  it('reports a mutating operation without compensatedBy', () => {
    const registry = new ContractRegistry();
    registry.register(CreateWithoutCompensation);
    expect(registry.validate()).toEqual([
      expect.objectContaining({
        code: RegistryIssueCode.MissingCompensation,
        operationId: 'a.create.v1',
      }),
    ]);
  });

  it('accepts a non-mutating operation without compensatedBy', () => {
    const registry = new ContractRegistry();
    registry.register(Read);
    expect(registry.validate()).toEqual([]);
  });

  it('reports compensatedBy pointing to an unregistered id', () => {
    const registry = new ContractRegistry();
    registry.register(Orphan);
    expect(registry.validate()).toEqual([
      expect.objectContaining({
        code: RegistryIssueCode.UnknownCompensation,
        operationId: 'a.orphan.v1',
      }),
    ]);
  });

  it('reports a call whose attempts exceed the default 25 000 ms budget', () => {
    const registry = new ContractRegistry();
    registry.register(SlowIdempotent, SlowOnce);
    // 10 000 ms x 3 attempts + 2 backoffs = 34 000 ms; the non-idempotent op gets one attempt of 30 000 ms.
    expect(registry.validate()).toEqual([
      expect.objectContaining({
        code: RegistryIssueCode.CallBudgetExceeded,
        operationId: 'a.slow.v1',
      }),
      expect.objectContaining({
        code: RegistryIssueCode.CallBudgetExceeded,
        operationId: 'a.slow-once.v1',
      }),
    ]);
  });

  it('counts the backoffs between attempts in the call budget', () => {
    const Tight = defineOperation({
      id: 'a.tight.v1',
      input: z.object({}),
      output: z.object({}),
      idempotent: true,
      mutating: false,
      timeoutMs: 8_000,
      description: 'Fits with timeout x attempts, not with the backoffs.',
    });
    const registry = new ContractRegistry();
    registry.register(Tight);

    // 8 000 ms x 3 attempts = 24 000 ms, plus 2 backoffs of up to 2 000 ms = 28 000 ms.
    expect(registry.validate()).toEqual([
      expect.objectContaining({
        code: RegistryIssueCode.CallBudgetExceeded,
        operationId: 'a.tight.v1',
      }),
    ]);
    expect(() => registry.assertValid()).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.CallBudgetExceeded,
      }),
    );
  });

  it('honours a configurable call budget', () => {
    const registry = new ContractRegistry({ maxCallBudgetMs: 40_000 });
    registry.register(SlowIdempotent, SlowOnce);
    expect(registry.validate()).toEqual([]);
  });

  it('throws InternalApiError with the matching code from assertValid', () => {
    const duplicates = new ContractRegistry();
    duplicates.register(Reserve, ReserveDuplicate);
    expect(() => duplicates.assertValid()).toThrow(InternalApiError);
    expect(() => duplicates.assertValid()).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.DuplicateOperation,
      }),
    );

    const missing = new ContractRegistry();
    missing.register(CreateWithoutCompensation);
    expect(() => missing.assertValid()).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.MissingCompensation,
      }),
    );
  });

  it('refuses to register a contract whose schema is not JSON-safe', () => {
    const registry = new ContractRegistry();
    expect(() => registry.register(RawDate)).toThrow(
      expect.objectContaining({ code: InternalApiErrorCode.NonJsonSafeSchema }),
    );
    expect(registry.get('a.raw-date.v1')).toBeUndefined();
  });

  it('gets registered contracts by id', () => {
    const registry = new ContractRegistry();
    registry.register(Reserve, Release);
    expect(registry.get('a.reserve.v1')?.ContractClass).toBe(Reserve);
    expect(registry.get('a.reserve.v1')?.contract.input).toBe(schema);
    expect(registry.get('a.reserve.v1')?.descriptor.id).toBe('a.reserve.v1');
    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.operations().map((operation) => operation.id)).toEqual([
      'a.reserve.v1',
      'a.release.v1',
    ]);
  });

  it('rejects a class without @Operation with InvalidOperation', () => {
    const registry = new ContractRegistry();
    expect(() => registry.register(Plain)).toThrow(
      expect.objectContaining({ code: InternalApiErrorCode.InvalidOperation }),
    );
  });

  it('registers defineOperation descriptors next to legacy classes', () => {
    const Revert = defineOperation({
      id: 'a.revert.v1',
      input: schema,
      output: schema,
      idempotent: true,
      compensatedBy: 'a.reserve.v1',
      errors: ['A.REVERT.GONE'],
      timeoutMs: 1000,
      description: 'Reverts a reservation.',
    });
    const registry = new ContractRegistry();
    registry.register(Revert, Reserve, Release);

    expect(registry.validate()).toEqual([]);
    const entry = registry.get('a.revert.v1');
    expect(entry?.ContractClass).toBeUndefined();
    expect(entry?.metadata).toMatchObject({
      id: 'a.revert.v1',
      compensatedBy: 'a.reserve.v1',
      mutating: true,
      idempotent: true,
      errors: ['A.REVERT.GONE'],
      timeoutMs: 1000,
    });
  });

  it('reports a descriptor whose compensation is not registered', () => {
    const Orphan = defineOperation({
      id: 'a.orphan.v1',
      input: schema,
      output: schema,
      idempotent: true,
      compensatedBy: 'a.missing.v1',
      description: 'Has no registered compensation.',
    });
    const registry = new ContractRegistry();
    registry.register(Orphan);

    expect(registry.validate().map((issue) => issue.code)).toEqual([
      RegistryIssueCode.UnknownCompensation,
    ]);
  });
});
