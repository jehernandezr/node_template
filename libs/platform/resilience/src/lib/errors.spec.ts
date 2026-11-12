import { ResilienceError, ResilienceErrorCode } from './errors.js';

describe('ResilienceError', () => {
  it('carries code, cause and retry hint', () => {
    const cause = new Error('root');
    const error = new ResilienceError(ResilienceErrorCode.Overloaded, 'busy', {
      cause,
      retryAfterMs: 250,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ResilienceError');
    expect(error.code).toBe('PLATFORM.RESILIENCE.OVERLOADED');
    expect(error.cause).toBe(cause);
    expect(error.retryAfterMs).toBe(250);
  });
});
