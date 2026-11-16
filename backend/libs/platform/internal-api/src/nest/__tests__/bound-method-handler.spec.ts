import { FixedClock } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { BoundMethodHandler } from '../bound-method-handler.js';
import { DecoratedHandlers } from './utils/decorated-handlers.js';

describe('BoundMethodHandler', () => {
  it('handle, decorated method, runs it with its own instance as this', async () => {
    const handlers = new DecoratedHandlers();
    const handler = new BoundMethodHandler(handlers, 'count');

    await handler.handle(
      { sku: 'A' },
      {
        idempotencyKey: 'k',
        timeoutMs: 1000,
        deadline: new FixedClock().now().getTime() + 1000,
      },
    );

    expect(handlers.countCalls).toBe(1);
  });

  it('handle, decorated method, returns what the method returns', async () => {
    const handler = new BoundMethodHandler(new DecoratedHandlers(), 'count');

    await expect(
      handler.handle(
        { sku: 'A' },
        {
          idempotencyKey: 'k',
          timeoutMs: 1000,
          deadline: new FixedClock().now().getTime() + 1000,
        },
      ),
    ).resolves.toEqual({ outcome: CallOutcome.success({ total: 3 }) });
  });

  it('constructor, name that is not a method, throws InvalidConfiguration', () => {
    expect(
      () => new BoundMethodHandler(new DecoratedHandlers(), 'missing'),
    ).toThrow(
      expect.objectContaining({
        code: InternalApiErrorCode.InvalidConfiguration,
      }),
    );
  });
});
