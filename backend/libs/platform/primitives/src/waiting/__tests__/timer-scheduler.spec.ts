import { TimerScheduler } from '../timer-scheduler.js';

/** Counts how many times a timer fired. */
class Firings {
  count = 0;

  readonly fire = (): void => {
    this.count += 1;
  };
}

describe('TimerScheduler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires after the given time and not before', () => {
    const firings = new Firings();
    TimerScheduler.arm(100, firings.fire);
    jest.advanceTimersByTime(99);
    expect(firings.count).toBe(0);
    jest.advanceTimersByTime(1);
    expect(firings.count).toBe(1);
  });

  it('can be cancelled', () => {
    const firings = new Firings();
    TimerScheduler.arm(100, firings.fire)();
    jest.advanceTimersByTime(1000);
    expect(firings.count).toBe(0);
  });

  it('splits waits longer than the setTimeout maximum', () => {
    const firings = new Firings();
    TimerScheduler.arm(TimerScheduler.MAX_TIMER_MS + 1000, firings.fire);
    jest.advanceTimersByTime(TimerScheduler.MAX_TIMER_MS);
    expect(firings.count).toBe(0);
    jest.advanceTimersByTime(1000);
    expect(firings.count).toBe(1);
  });

  it('treats a negative wait as zero', () => {
    const firings = new Firings();
    TimerScheduler.arm(-5, firings.fire);
    jest.advanceTimersByTime(0);
    expect(firings.count).toBe(1);
  });

  it('armDetached fires like arm but does not keep the process alive', () => {
    const firings = new Firings();
    TimerScheduler.armDetached(10, firings.fire);
    jest.advanceTimersByTime(10);
    expect(firings.count).toBe(1);
  });

  describe('abortReason', () => {
    it('returns the reason when it is an Error', () => {
      const reason = new Error('stop');
      const controller = new AbortController();
      controller.abort(reason);
      expect(TimerScheduler.abortReason(controller.signal)).toBe(reason);
    });

    it('wraps any other reason in an Error', () => {
      const controller = new AbortController();
      controller.abort('why');
      const error = TimerScheduler.abortReason(controller.signal);
      expect(error).toBeInstanceOf(Error);
      expect(error.cause).toBe('why');
    });
  });
});
