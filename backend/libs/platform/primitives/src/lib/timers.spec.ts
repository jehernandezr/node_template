import { FixedClock } from '@platform/kernel/testing';
import { Deadline } from './deadline.js';
import { DeadlineExceededError, InvalidArgumentError } from './errors.js';
import {
  abortableSleep,
  armTimer,
  MAX_TIMER_MS,
  raceDeadline,
  RaceStop,
} from './timers.js';

describe('timers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('armTimer', () => {
    it('splits waits longer than the setTimeout maximum', () => {
      const fire = jest.fn();
      armTimer(MAX_TIMER_MS + 10, fire);
      jest.advanceTimersByTime(MAX_TIMER_MS);
      expect(fire).not.toHaveBeenCalled();
      jest.advanceTimersByTime(10);
      expect(fire).toHaveBeenCalledTimes(1);
    });

    it('can be cancelled', () => {
      const fire = jest.fn();
      const cancel = armTimer(100, fire);
      cancel();
      jest.advanceTimersByTime(200);
      expect(fire).not.toHaveBeenCalled();
    });
  });

  describe('abortableSleep', () => {
    it('resolves after the wait', async () => {
      const done = jest.fn();
      const sleeping = abortableSleep(50).then(done);
      await jest.advanceTimersByTimeAsync(49);
      expect(done).not.toHaveBeenCalled();
      await jest.advanceTimersByTimeAsync(1);
      await sleeping;
      expect(done).toHaveBeenCalled();
    });

    it('rejects with the abort reason and clears the timer', async () => {
      const controller = new AbortController();
      const sleeping = abortableSleep(1_000, { signal: controller.signal });
      const reason = new Error('stop');
      controller.abort(reason);
      await expect(sleeping).rejects.toBe(reason);
      expect(jest.getTimerCount()).toBe(0);
    });

    it('rejects at once when the signal already aborted', async () => {
      await expect(
        abortableSleep(10, { signal: AbortSignal.abort('gone') }),
      ).rejects.toMatchObject({ cause: 'gone' });
    });

    it('rejects invalid waits', () => {
      expect(() => abortableSleep(-1)).toThrow(InvalidArgumentError);
      expect(() => abortableSleep(Number.NaN)).toThrow(InvalidArgumentError);
    });
  });

  describe('raceDeadline', () => {
    it('returns the value when the work settles in time', async () => {
      const result = await raceDeadline(async () => 7, { timeoutMs: 100 });
      expect(result).toEqual({ settled: true, value: 7 });
      expect(jest.getTimerCount()).toBe(0);
    });

    it('stops at the deadline and aborts the work signal', async () => {
      const clock = new FixedClock(new Date(1_000));
      const deadline = Deadline.after(50, clock);
      let seen: AbortSignal | undefined;
      const racing = raceDeadline(
        (signal) => {
          seen = signal;
          return new Promise<never>(() => undefined);
        },
        { deadline },
      );
      await jest.advanceTimersByTimeAsync(50);
      await expect(racing).resolves.toEqual({
        settled: false,
        stop: RaceStop.Timeout,
      });
      expect(seen?.aborted).toBe(true);
      expect(seen?.reason).toBeInstanceOf(DeadlineExceededError);
      expect((seen?.reason as DeadlineExceededError).details).toEqual({
        deadlineAtMs: 1_050,
      });
    });

    it('uses the shorter of deadline and timeoutMs', async () => {
      const deadline = Deadline.after(1_000, new FixedClock(new Date(0)));
      const racing = raceDeadline(() => new Promise<never>(() => undefined), {
        deadline,
        timeoutMs: 10,
      });
      await jest.advanceTimersByTimeAsync(10);
      await expect(racing).resolves.toMatchObject({ stop: RaceStop.Timeout });
    });

    it('stops when the caller aborts', async () => {
      const controller = new AbortController();
      const racing = raceDeadline(() => new Promise<never>(() => undefined), {
        signal: controller.signal,
      });
      controller.abort();
      await expect(racing).resolves.toEqual({
        settled: false,
        stop: RaceStop.Aborted,
      });
    });

    it('does not start the work when the signal already aborted', async () => {
      const work = jest.fn(async () => 1);
      const result = await raceDeadline(work, { signal: AbortSignal.abort() });
      expect(result).toEqual({ settled: false, stop: RaceStop.Aborted });
      expect(work).not.toHaveBeenCalled();
    });

    it('propagates an error thrown by the work, also synchronously', async () => {
      const boom = new Error('boom');
      await expect(
        raceDeadline(async () => Promise.reject(boom), { timeoutMs: 10 }),
      ).rejects.toBe(boom);
      await expect(
        raceDeadline(
          () => {
            throw boom;
          },
          { timeoutMs: 10 },
        ),
      ).rejects.toBe(boom);
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
