import { TimerScheduler } from '../timer-scheduler.js';

describe('TimerScheduler', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('fires after the given time and not before', () => {
    const fire = jest.fn();
    TimerScheduler.arm(100, fire);
    jest.advanceTimersByTime(99);
    expect(fire).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('can be cancelled', () => {
    const fire = jest.fn();
    TimerScheduler.arm(100, fire)();
    jest.advanceTimersByTime(1000);
    expect(fire).not.toHaveBeenCalled();
  });

  it('splits waits longer than the setTimeout maximum', () => {
    const fire = jest.fn();
    TimerScheduler.arm(TimerScheduler.MAX_TIMER_MS + 1000, fire);
    jest.advanceTimersByTime(TimerScheduler.MAX_TIMER_MS);
    expect(fire).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1000);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('treats a negative wait as zero', () => {
    const fire = jest.fn();
    TimerScheduler.arm(-5, fire);
    jest.advanceTimersByTime(0);
    expect(fire).toHaveBeenCalledTimes(1);
  });

  it('armDetached fires like arm but does not keep the process alive', () => {
    const fire = jest.fn();
    TimerScheduler.armDetached(10, fire);
    jest.advanceTimersByTime(10);
    expect(fire).toHaveBeenCalledTimes(1);
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
