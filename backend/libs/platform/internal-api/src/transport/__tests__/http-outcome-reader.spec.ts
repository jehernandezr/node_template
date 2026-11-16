import { FixedClock } from '@platform/kernel/test-utils';
import {
  CallOutcome,
  CallOutcomeKind,
  RetryAfterParser,
} from '@platform/primitives';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { InternalApiReason } from '../../contract/internal-api-reason.enum.js';
import { HttpOutcomeReader } from '../http-outcome-reader.js';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('HttpOutcomeReader', () => {
  const clock = new FixedClock(new Date('2026-01-01T00:00:00.000Z'));
  const reader = new HttpOutcomeReader(new RetryAfterParser(clock));

  describe('read with status 200', () => {
    it('returns the success outcome of the body', async () => {
      const outcome = CallOutcome.success({ greeting: 'Hello Ana' });

      await expect(reader.read(jsonResponse({ outcome }))).resolves.toEqual(
        outcome,
      );
    });

    it('returns the business error outcome of the body', async () => {
      const outcome = CallOutcome.businessError('BILLING.NO_FUNDS', {
        message: 'Low balance',
      });

      await expect(reader.read(jsonResponse({ outcome }))).resolves.toEqual(
        outcome,
      );
    });

    it.each([
      ['an empty object', {}],
      ['an outcome without a known kind', { outcome: { kind: 'other' } }],
    ])(
      'answers invalid-response for a body that is %s',
      async (_label, body) => {
        await expect(reader.read(jsonResponse(body))).resolves.toEqual(
          CallOutcome.protocolViolation(InternalApiReason.InvalidResponse),
        );
      },
    );

    it('answers invalid-response for a body that is not JSON', async () => {
      await expect(
        reader.read(new Response('<html>ok</html>', { status: 200 })),
      ).resolves.toEqual(
        CallOutcome.protocolViolation(InternalApiReason.InvalidResponse),
      );
    });
  });

  describe('read with other statuses', () => {
    it.each([401, 403])(
      'answers unauthenticated for status %i',
      async (status) => {
        await expect(
          reader.read(new Response(null, { status })),
        ).resolves.toEqual(
          CallOutcome.protocolViolation(
            InternalApiReason.Unauthenticated,
            InternalApiErrorCode.Unauthenticated,
          ),
        );
      },
    );

    it('answers a transient failure with the server retry hint for 429', async () => {
      const response = new Response(null, {
        status: 429,
        headers: { 'retry-after': '2' },
      });

      await expect(reader.read(response)).resolves.toEqual({
        kind: CallOutcomeKind.TransientFailure,
        reason: 'http-429',
        retryAfterMs: 2000,
      });
    });

    it('answers a transient failure without retry hint for 503', async () => {
      const outcome = await reader.read(new Response(null, { status: 503 }));

      expect(outcome).toEqual({
        kind: CallOutcomeKind.TransientFailure,
        reason: 'http-503',
      });
      expect(outcome).not.toHaveProperty('retryAfterMs');
    });

    it.each([502, 504])('answers uncertain for status %i', async (status) => {
      await expect(
        reader.read(new Response(null, { status })),
      ).resolves.toEqual(CallOutcome.uncertain(`http-${status}`));
    });

    it('answers unexpected-status without code for status 418', async () => {
      const outcome = await reader.read(new Response(null, { status: 418 }));

      expect(outcome).toEqual(
        CallOutcome.protocolViolation(InternalApiReason.UnexpectedStatus),
      );
      expect(outcome).not.toHaveProperty('code');
    });
  });
});
