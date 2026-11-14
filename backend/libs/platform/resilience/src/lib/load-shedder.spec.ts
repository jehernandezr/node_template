import { LoadShedder } from './load-shedder.js';
import { ResilienceError, ResilienceErrorCode } from './errors.js';

describe('LoadShedder', () => {
  it('limits in-flight calls and releases slots', () => {
    const shedder = new LoadShedder({ maxInFlight: 2, retryAfterMs: 1_000 });

    const releaseFirst = shedder.tryAcquire();
    const releaseSecond = shedder.tryAcquire();
    expect(shedder.inFlight).toBe(2);

    let caught: unknown;
    try {
      shedder.tryAcquire();
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(ResilienceError);
    expect((caught as ResilienceError).code).toBe(
      ResilienceErrorCode.Overloaded,
    );
    expect((caught as ResilienceError).retryAfterMs).toBe(1_000);
    expect(shedder.inFlight).toBe(2);

    releaseFirst();
    expect(shedder.inFlight).toBe(1);
    releaseFirst();
    expect(shedder.inFlight).toBe(1);

    const releaseThird = shedder.tryAcquire();
    expect(shedder.inFlight).toBe(2);
    releaseSecond();
    releaseThird();
    expect(shedder.inFlight).toBe(0);
  });
});
