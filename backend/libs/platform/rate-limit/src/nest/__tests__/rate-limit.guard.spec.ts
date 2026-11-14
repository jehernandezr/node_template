import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { RateLimitErrorCode } from '../../errors/rate-limit-error-code.enum.js';
import { RateLimit } from '../rate-limit.metadata.js';
import { RateLimitGuard } from '../rate-limit.guard.js';
import { RateLimitModule } from '../rate-limit.module.js';
import { FakeHttpExecutionContext } from './utils/fake-http-execution-context.js';

const START = new Date('2025-01-01T00:00:00.000Z');

class ProfileController {
  @RateLimit({ name: 'profile.read', limit: 2, windowMs: 60_000 })
  read(): string {
    return 'ok';
  }

  unlimited(): string {
    return 'ok';
  }
}

describe('RateLimitGuard', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: START });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function guard(): Promise<RateLimitGuard> {
    const ref = await Test.createTestingModule({
      imports: [RateLimitModule.forRoot()],
    }).compile();
    return ref.get(RateLimitGuard);
  }

  it('lets calls through up to the limit and then rejects with the wait', async () => {
    const limiter = await guard();
    const context = new FakeHttpExecutionContext(
      { ip: '10.0.0.1' },
      ProfileController,
      ProfileController.prototype.read,
    );
    await expect(limiter.canActivate(context)).resolves.toBe(true);
    await expect(limiter.canActivate(context)).resolves.toBe(true);
    await expect(limiter.canActivate(context)).rejects.toMatchObject({
      code: RateLimitErrorCode.Exceeded,
      retryAfterMs: 90_000,
    });
  });

  it('lets through routes without the decorator', async () => {
    const limiter = await guard();
    const context = new FakeHttpExecutionContext(
      { ip: '10.0.0.2' },
      ProfileController,
      ProfileController.prototype.unlimited,
    );
    await expect(limiter.canActivate(context)).resolves.toBe(true);
    await expect(limiter.canActivate(context)).resolves.toBe(true);
    await expect(limiter.canActivate(context)).resolves.toBe(true);
  });
});
