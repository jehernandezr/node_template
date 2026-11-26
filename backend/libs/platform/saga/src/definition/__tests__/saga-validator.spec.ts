import {
  Compensation,
  defineOperation,
  type OperationDefinition,
} from '@contracts/platform';
import {
  ContractRegistry,
  JsonSafetyChecker,
  OperationResolver,
} from '@platform/internal-api';
import { z } from 'zod';
import { SagaDefinition } from '../saga-definition.js';
import type { CompiledSaga } from '../compiled-saga.js';
import type { SagaFlow } from '../saga-flow.js';
import { SagaDefinitionIssueCode } from '../saga-definition-issue-code.enum.js';
import { SagaValidator } from '../saga-validator.js';

const REGISTRY_COLLABORATORS = {
  resolver: new OperationResolver(),
  jsonSafety: new JsonSafetyChecker(),
};

const FAST = {
  timeoutMs: 500,
  retry: { maxAttempts: 2, baseMs: 10, maxMs: 100 },
} as const;

const CREATE = defineOperation({
  id: 'a.item.create.v1',
  input: z.object({ name: z.string() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  compensatedBy: 'a.item.remove.v1',
  description: 'Creates an a.',
  ...FAST,
});
const REMOVE = defineOperation({
  id: 'a.item.remove.v1',
  input: z.object({ id: z.string() }),
  output: z.object({ removed: z.boolean() }),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'Removing is not undone.',
  description: 'Removes an a.',
  ...FAST,
});
const SEND = defineOperation({
  id: 'post.item.send.v1',
  input: z.unknown(),
  output: z.unknown(),
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'A sent post cannot be recalled.',
  description: 'Sends a post.',
  ...FAST,
});

class FlowSaga extends SagaDefinition<unknown> {
  readonly type = 'flow';

  protected override define(flow: SagaFlow<unknown>): void {
    flow.step(CREATE).pivot().step(SEND);
  }
}

const resolver = new OperationResolver();

/** Compiles the flow's saga with its test contracts. */
function compiled(): CompiledSaga<unknown>[] {
  return [new FlowSaga().build(resolver)];
}

/** Registry with the given operations; the rest do not exist for the validator. */
function registryWith(...definitions: OperationDefinition[]): ContractRegistry {
  const registry = new ContractRegistry(REGISTRY_COLLABORATORS);
  registry.register(...definitions);
  return registry;
}

function codesOf(issues: { code: SagaDefinitionIssueCode }[]): string[] {
  return issues.map((issue) => issue.code);
}

describe('SagaValidator', () => {
  it('finds no problems when the contracts match the steps', () => {
    const validator = new SagaValidator(
      resolver,
      10_000,
      registryWith(CREATE, REMOVE, SEND),
    );

    expect(validator.validate(compiled())).toEqual([]);
  });

  it('works without a contract registry: it only checks the step contracts', () => {
    const validator = new SagaValidator(resolver, 10_000);

    expect(validator.validate(compiled())).toEqual([]);
  });

  it('reports an operation that is not registered', () => {
    const validator = new SagaValidator(
      resolver,
      10_000,
      registryWith(REMOVE, SEND),
    );

    const issues = validator.validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.UnregisteredOperation,
    );
    expect(issues[0]?.operationId).toBe('a.item.create.v1');
    expect(issues[0]?.stepIndex).toBe(0);
  });

  it('reports a compensation that differs from the contract compensatedBy', () => {
    const CreateOther = defineOperation({
      id: 'a.item.create.v1',
      input: z.object({ name: z.string() }),
      output: z.object({ id: z.string() }),
      idempotent: true,
      compensatedBy: 'other.remove.v1',
      description: 'Creates an a, compensated elsewhere.',
      ...FAST,
    });

    const issues = new SagaValidator(
      resolver,
      10_000,
      registryWith(CreateOther, REMOVE, SEND),
    ).validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.CompensationMismatch,
    );
  });

  it('reports a mutating step before the pivot whose contract declares no compensation', () => {
    const CreateFinal = defineOperation({
      id: 'a.item.create.v1',
      input: z.object({ name: z.string() }),
      output: z.object({ id: z.string() }),
      idempotent: true,
      compensatedBy: Compensation.None,
      compensationReason: 'Creation is final.',
      description: 'Creates an a for good.',
      ...FAST,
    });

    const issues = new SagaValidator(
      resolver,
      10_000,
      registryWith(CreateFinal, REMOVE, SEND),
    ).validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.MissingCompensation,
    );
  });

  it('reports a step after the pivot that the contract does not mark idempotent', () => {
    const SendOnce = defineOperation({
      id: 'post.item.send.v1',
      input: z.unknown(),
      output: z.unknown(),
      idempotent: false,
      compensatedBy: Compensation.None,
      compensationReason: 'A sent post cannot be recalled.',
      description: 'Sends a post once.',
      ...FAST,
    });

    const issues = new SagaValidator(
      resolver,
      10_000,
      registryWith(CREATE, REMOVE, SendOnce),
    ).validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.NotIdempotentAfterPivot,
    );
  });

  it('reports a registered compensation that is not idempotent', () => {
    const RemoveOnce = defineOperation({
      id: 'a.item.remove.v1',
      input: z.object({ id: z.string() }),
      output: z.object({ removed: z.boolean() }),
      idempotent: false,
      compensatedBy: Compensation.None,
      compensationReason: 'Removing is not undone.',
      description: 'Removes an a once.',
      ...FAST,
    });

    const issues = new SagaValidator(
      resolver,
      10_000,
      registryWith(CREATE, RemoveOnce, SEND),
    ).validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.NotIdempotentCompensation,
    );
  });

  it('reports a compensation that is not registered', () => {
    const issues = new SagaValidator(
      resolver,
      10_000,
      registryWith(CREATE, SEND),
    ).validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.UnregisteredCompensation,
    );
  });

  it('reports a call whose budget exceeds maxStepDurationMs', () => {
    const issues = new SagaValidator(
      resolver,
      100,
      registryWith(CREATE, REMOVE, SEND),
    ).validate(compiled());

    expect(codesOf(issues)).toContain(
      SagaDefinitionIssueCode.StepBudgetExceeded,
    );
  });
});
