import { defineOperation } from '@contracts/platform';
import { CallOutcome } from '@platform/primitives';
import { z } from 'zod';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { OperationResolver } from '../../contract/operation-resolver.js';
import { PayloadLimit } from '../../contract/payload-limit.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { ClientOutcomeChecker } from '../client-outcome-checker.js';

const NO_FUNDS = 'BILLING.INVOICES.NO_FUNDS';

const Create = defineOperation({
  id: 'billing.invoices.create.v1',
  input: z.object({ amount: z.number() }),
  output: z.object({ id: z.string() }),
  idempotent: true,
  mutating: false,
  errors: [NO_FUNDS],
  description: 'Creates an invoice.',
});

const descriptor = new OperationResolver().resolve(Create);

describe('ClientOutcomeChecker', () => {
  const checker = new ClientOutcomeChecker(new PayloadLimit());

  it.each([
    [
      'a success that matches the output schema',
      CallOutcome.success({ id: 'i-1', extra: true }),
      CallOutcome.success({ id: 'i-1' }),
    ],
    [
      'a success whose output does not match',
      CallOutcome.success({ wrong: true }),
      CallOutcome.protocolViolation(
        InternalApiReason.InvalidOutput,
        InternalApiErrorCode.InvalidOutput,
      ),
    ],
    [
      'a declared business error',
      CallOutcome.businessError(NO_FUNDS),
      CallOutcome.businessError(NO_FUNDS),
    ],
    [
      'an undeclared business error',
      CallOutcome.businessError('SURPRISE'),
      CallOutcome.protocolViolation(
        InternalApiReason.UndeclaredError,
        'SURPRISE',
      ),
    ],
    [
      'a protocol violation',
      CallOutcome.protocolViolation('bad-frame'),
      CallOutcome.protocolViolation('bad-frame'),
    ],
    [
      'a transient failure',
      CallOutcome.transientFailure('busy'),
      CallOutcome.transientFailure('busy'),
    ],
    [
      'an uncertain outcome',
      CallOutcome.uncertain('timeout'),
      CallOutcome.uncertain('timeout'),
    ],
  ])('settles %s', (_label, outcome: CallOutcome<unknown>, expected) => {
    expect(checker.settle(descriptor, outcome)).toEqual(expected);
  });

  it('rejects a success larger than the payload limit', () => {
    const tight = new ClientOutcomeChecker(new PayloadLimit(16));

    expect(
      tight.settle(descriptor, CallOutcome.success({ id: 'i-'.repeat(20) })),
    ).toEqual(
      CallOutcome.protocolViolation(
        InternalApiReason.PayloadTooLarge,
        InternalApiErrorCode.PayloadTooLarge,
      ),
    );
  });

  it('rejects an unknown outcome kind as an invalid handler result', () => {
    const unknownKind: CallOutcome<unknown> = JSON.parse(
      '{"kind":"something-else"}',
    );

    expect(checker.settle(descriptor, unknownKind)).toEqual(
      CallOutcome.protocolViolation(
        InternalApiReason.InvalidHandlerResult,
        InternalApiErrorCode.InvalidHandlerResult,
      ),
    );
  });
});
