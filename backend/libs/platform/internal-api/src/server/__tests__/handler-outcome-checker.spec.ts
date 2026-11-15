import { defineOperation } from '@contracts/platform';
import { CallOutcome } from '@platform/primitives';
import { z } from 'zod';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { OperationResolver } from '../../contract/operation-resolver.js';
import { PayloadLimit } from '../../contract/payload-limit.js';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { HandlerOutcomeChecker } from '../handler-outcome-checker.js';
import { OperationRoute } from '../operation-route.js';
import { ScriptedHandler } from './utils/scripted-handler.js';
import { ServerHarness } from './utils/server-harness.js';

const Reserve = defineOperation({
  id: 'stock.reserve.v1',
  input: z.object({ sku: z.string(), qty: z.number().int().positive() }),
  output: z.object({ reservationId: z.string() }),
  idempotent: true,
  compensatedBy: 'stock.release.v1',
  errors: [ServerHarness.OUT_OF_STOCK],
  description: 'Reserves stock.',
});

const route = OperationRoute.bind(
  new OperationResolver().resolve(Reserve),
  new ScriptedHandler(),
);

describe('HandlerOutcomeChecker', () => {
  describe('check', () => {
    it.each([
      ['a text value', 'nope'],
      ['null', null],
      ['an object without outcome', { ok: true }],
    ])(
      'check, handler returns %s, answers invalid-handler-result',
      (_label, value) => {
        const checker = new HandlerOutcomeChecker(new PayloadLimit(1024));

        expect(
          checker.check(route, HandlerOutcomeChecker.outcomeOf(value)),
        ).toEqual(
          CallOutcome.protocolViolation(
            InternalApiReason.InvalidHandlerResult,
            InternalApiErrorCode.InvalidHandlerResult,
          ),
        );
      },
    );

    it('check, success whose output breaks the schema, answers invalid-output', () => {
      const checker = new HandlerOutcomeChecker(new PayloadLimit(1024));

      expect(checker.check(route, CallOutcome.success({ wrong: 1 }))).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.InvalidOutput,
          InternalApiErrorCode.InvalidOutput,
        ),
      );
    });

    it('check, success above the payload limit, answers payload-too-large', () => {
      const checker = new HandlerOutcomeChecker(new PayloadLimit(32));

      expect(
        checker.check(
          route,
          CallOutcome.success({ reservationId: 'r'.repeat(40) }),
        ),
      ).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.PayloadTooLarge,
          InternalApiErrorCode.PayloadTooLarge,
        ),
      );
    });

    it('check, valid success, returns the parsed value', () => {
      const checker = new HandlerOutcomeChecker(new PayloadLimit(1024));

      expect(
        checker.check(route, CallOutcome.success({ reservationId: 'r-1' })),
      ).toEqual(CallOutcome.success({ reservationId: 'r-1' }));
    });

    it('check, declared business error, returns it unchanged', () => {
      const checker = new HandlerOutcomeChecker(new PayloadLimit(1024));
      const outcome = CallOutcome.businessError(ServerHarness.OUT_OF_STOCK);

      expect(checker.check(route, outcome)).toEqual(outcome);
    });

    it('check, business error outside the declared codes, answers undeclared-error', () => {
      const checker = new HandlerOutcomeChecker(new PayloadLimit(1024));

      expect(
        checker.check(route, CallOutcome.businessError('SURPRISE')),
      ).toEqual(
        CallOutcome.protocolViolation(
          InternalApiReason.UndeclaredError,
          'SURPRISE',
        ),
      );
    });

    it.each([
      ['transient failure', CallOutcome.transientFailure('db-down')],
      ['uncertain', CallOutcome.uncertain('timeout')],
    ])('check, %s, returns it unchanged', (_label, outcome) => {
      const checker = new HandlerOutcomeChecker(new PayloadLimit(1024));

      expect(checker.check(route, outcome)).toEqual(outcome);
    });
  });

  describe('outcomeOf', () => {
    it('outcomeOf, handler result with an outcome, returns that outcome', () => {
      const outcome = CallOutcome.transientFailure('db-down');

      expect(HandlerOutcomeChecker.outcomeOf({ outcome })).toBe(outcome);
    });

    it.each([
      ['null', null],
      ['a text', 'nope'],
    ])('outcomeOf, %s, returns the value as it is', (_label, value) => {
      expect(HandlerOutcomeChecker.outcomeOf(value)).toBe(value);
    });
  });
});
