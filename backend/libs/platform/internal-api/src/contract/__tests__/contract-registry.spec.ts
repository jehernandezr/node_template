import { OperationResolver } from '../../contract/operation-resolver.js';
import { JsonSafetyChecker } from '../../contract/json-safety-checker.js';
import {
  Compensation,
  defineOperation,
  type OperationDefinition,
} from '@contracts/platform';
import { z } from 'zod';
import { InternalApiError } from '../../errors/internal-api-error.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { ContractRegistry } from '../contract-registry.js';
import { RegistryIssueCode } from '../registry-issue-code.enum.js';

const REGISTRY_COLLABORATORS = {
  resolver: new OperationResolver(),
  jsonSafety: new JsonSafetyChecker(),
};

const schema = z.object({});

/**
 * Descriptor built without `defineOperation`, so the registry checks can be
 * exercised on shapes that `defineOperation` would already reject.
 */
function op(
  fields: Partial<OperationDefinition> & Pick<OperationDefinition, 'id'>,
): OperationDefinition {
  return {
    version: 1,
    description: 'Test operation',
    input: schema,
    output: schema,
    idempotent: true,
    mutating: true,
    errors: [],
    ...fields,
  };
}

const Reserve = op({ id: 'a.reserve.v1', compensatedBy: 'a.release.v1' });
const Release = op({
  id: 'a.release.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Releasing is final',
});
const Read = op({ id: 'a.read.v1', mutating: false });
const CreateWithoutCompensation = op({ id: 'a.create.v1' });
const Orphan = op({ id: 'a.orphan.v1', compensatedBy: 'a.missing.v1' });
const ReserveDuplicate = op({
  id: 'a.reserve.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Duplicate',
});
const SlowIdempotent = op({
  id: 'a.slow.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Slow',
  timeoutMs: 10_000,
});
const SlowOnce = op({
  id: 'a.slow-once.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Once',
  idempotent: false,
  timeoutMs: 30_000,
});
const RawDate = op({
  id: 'a.raw-date.v1',
  compensatedBy: Compensation.None,
  compensationReason: 'Dates',
  output: z.object({ at: z.date() }),
});

describe('ContractRegistry', () => {
  it('reports no issues for a valid registry', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Reserve, Release, Read);
    expect(registry.validate()).toEqual([]);
    expect(() => registry.assertValid()).not.toThrow();
  });

  it('reports duplicate ids', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
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
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(CreateWithoutCompensation);
    expect(registry.validate()).toEqual([
      expect.objectContaining({
        code: RegistryIssueCode.MissingCompensation,
        operationId: 'a.create.v1',
      }),
    ]);
  });

  it('accepts a non-mutating operation without compensatedBy', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Read);
    expect(registry.validate()).toEqual([]);
  });

  it('reports compensatedBy pointing to an unregistered id', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Orphan);
    expect(registry.validate()).toEqual([
      expect.objectContaining({
        code: RegistryIssueCode.UnknownCompensation,
        operationId: 'a.orphan.v1',
      }),
    ]);
  });

  it('reports a call whose attempts exceed the default 25 000 ms budget', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(SlowIdempotent, SlowOnce);
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
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Tight);

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
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS, {
      maxCallBudgetMs: 40_000,
    });
    registry.register(SlowIdempotent, SlowOnce);
    expect(registry.validate()).toEqual([]);
  });

  it('throws InternalApiError with the matching code from assertValid', () => {
    const duplicates = new ContractRegistry(REGISTRY_COLLABORATORS);
    duplicates.register(Reserve, ReserveDuplicate);
    expect(() => duplicates.assertValid()).toThrow(InternalApiError);
    expect(() => duplicates.assertValid()).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.DuplicateOperation,
      }),
    );

    const missing = new ContractRegistry(REGISTRY_COLLABORATORS);
    missing.register(CreateWithoutCompensation);
    expect(() => missing.assertValid()).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.MissingCompensation,
      }),
    );
  });

  it('refuses to register a contract whose schema is not JSON-safe', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    expect(() => registry.register(RawDate)).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.NonJsonSafeSchema,
      }),
    );
    expect(registry.get('a.raw-date.v1')).toBeUndefined();
  });

  it('gets registered contracts by id', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Reserve, Release);
    expect(registry.get('a.reserve.v1')?.contract.input).toBe(schema);
    expect(registry.get('a.reserve.v1')?.descriptor.id).toBe('a.reserve.v1');
    expect(registry.get('unknown')).toBeUndefined();
    expect(registry.operations().map((operation) => operation.id)).toEqual([
      'a.reserve.v1',
      'a.release.v1',
    ]);
  });

  it('rejects something that is not a descriptor with InvalidOperation', () => {
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    expect(() =>
      registry.register({ id: 'a.plain.v1' } as unknown as OperationDefinition),
    ).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.InvalidOperation,
      }),
    );
  });

  it('keeps the metadata of a defineOperation descriptor', () => {
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
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Revert, Reserve, Release);

    expect(registry.validate()).toEqual([]);
    const entry = registry.get('a.revert.v1');
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
    const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
    registry.register(Orphan);

    expect(registry.validate().map((issue) => issue.code)).toEqual([
      RegistryIssueCode.UnknownCompensation,
    ]);
  });
});
