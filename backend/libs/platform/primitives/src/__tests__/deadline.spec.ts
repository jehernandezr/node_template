import { PrimitivesErrorCode } from '../errors/primitives-error-code.enum.js';
import { FixedClock } from '@platform/kernel/test-utils';
import { Deadline } from '../deadline.js';
import { DeadlineExceededError, InvalidArgumentError } from '../index.js';

const START = new Date('2026-11-12T10:00:00.000Z');

describe('Deadline', () => {
  let clock: FixedClock;

  beforeEach(() => {
    clock = new FixedClock(START);
  });

  describe('creation', () => {
    it('after() is now plus the budget', () => {
      const deadline = Deadline.after(1_000, clock);
      expect(deadline.atMs).toBe(START.getTime() + 1_000);
      expect(deadline.remainingMs()).toBe(1_000);
    });

    it('at() keeps the absolute instant', () => {
      const deadline = Deadline.at(START.getTime() + 250, clock);
      expect(deadline.remainingMs()).toBe(250);
    });

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
      'after() rejects budget %p',
      (budget) => {
        expect(() => Deadline.after(budget, clock)).toThrow(
          InvalidArgumentError,
        );
      },
    );

    it('at() rejects a non-finite instant', () => {
      expect(() => Deadline.at(Number.NaN, clock)).toThrow(
        InvalidArgumentError,
      );
    });

    it('serializes as the absolute instant', () => {
      expect(JSON.stringify({ d: Deadline.after(5, clock) })).toBe(
        `{"d":${START.getTime() + 5}}`,
      );
    });
  });

  describe('remaining and expiry', () => {
    it('counts down with the clock and never goes below zero', () => {
      const deadline = Deadline.after(1_000, clock);
      clock.advance(400);
      expect(deadline.remainingMs()).toBe(600);
      expect(deadline.isExpired()).toBe(false);
      clock.advance(600);
      expect(deadline.remainingMs()).toBe(0);
      expect(deadline.isExpired()).toBe(true);
      clock.advance(5_000);
      expect(deadline.remainingMs()).toBe(0);
    });

    it('throwIfExpired throws DeadlineExceededError only once expired', () => {
      const deadline = Deadline.after(10, clock);
      expect(() => deadline.throwIfExpired()).not.toThrow();
      clock.advance(10);
      expect(() => deadline.throwIfExpired()).toThrow(DeadlineExceededError);
      expect(() => deadline.throwIfExpired()).toThrow(
        expect.objectContaining({
          code: PrimitivesErrorCode.DeadlineExceeded,
        }),
      );
    });

    it('a zero budget is already expired', () => {
      expect(Deadline.after(0, clock).isExpired()).toBe(true);
    });
  });

  describe('child', () => {
    it('uses the requested budget when it fits in the parent', () => {
      const parent = Deadline.after(10_000, clock);
      const child = parent.child(2_000);
      expect(child.atMs).toBe(START.getTime() + 2_000);
    });

    it('never exceeds the parent', () => {
      const parent = Deadline.after(1_000, clock);
      expect(parent.child(5_000).atMs).toBe(parent.atMs);
      clock.advance(900);
      expect(parent.child(500).atMs).toBe(parent.atMs);
      expect(parent.child(500).remainingMs()).toBe(100);
    });

    it('is expired when the parent is expired', () => {
      const parent = Deadline.after(100, clock);
      clock.advance(200);
      const child = parent.child(1_000);
      expect(child.isExpired()).toBe(true);
      expect(child.atMs).toBe(parent.atMs);
    });

    it('rejects an invalid budget', () => {
      expect(() => Deadline.after(1, clock).child(-5)).toThrow(
        InvalidArgumentError,
      );
    });

    it('min() returns the earliest deadline', () => {
      const early = Deadline.after(100, clock);
      const late = Deadline.after(900, clock);
      expect(early.min(late)).toBe(early);
      expect(late.min(early)).toBe(early);
    });
  });

  describe('toAbortSignal', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('aborts with DeadlineExceededError after the remaining time', () => {
      const deadline = Deadline.after(1_000, clock);
      clock.advance(400);
      const signal = deadline.toAbortSignal();

      jest.advanceTimersByTime(599);
      expect(signal.aborted).toBe(false);

      jest.advanceTimersByTime(1);
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBeInstanceOf(DeadlineExceededError);
      expect((signal.reason as DeadlineExceededError).details).toEqual({
        deadlineAtMs: deadline.atMs,
      });
    });

    it('is already aborted when the deadline has passed', () => {
      const deadline = Deadline.after(10, clock);
      clock.advance(10);
      const signal = deadline.toAbortSignal();
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBeInstanceOf(DeadlineExceededError);
    });

    it('fires a deadline longer than the setTimeout limit in chunks', () => {
      const limit = 2_147_483_647;
      const deadline = Deadline.after(limit + 1_000, clock);
      const signal = deadline.toAbortSignal();

      jest.advanceTimersByTime(limit);
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(999);
      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(1);
      expect(signal.aborted).toBe(true);
    });

    it('does not keep the process alive', () => {
      jest.useRealTimers();
      const aliveTimers = (): number =>
        process
          .getActiveResourcesInfo()
          .filter((resource) => resource === 'Timeout').length;
      const before = aliveTimers();

      const signal = Deadline.after(60_000, new FixedClock()).toAbortSignal();

      expect(signal.aborted).toBe(false);
      expect(aliveTimers()).toBe(before);
    });
  });
});

describe('Deadline waiting', () => {
  const clock = new FixedClock(START);

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('new Deadline(budget, clock) is now plus the budget', () => {
    expect(new Deadline(500, clock).remainingMs()).toBe(500);
  });

  describe('wait', () => {
    it('resolves with the promise value', async () => {
      await expect(
        Deadline.after(1_000, clock).wait(Promise.resolve('ok')),
      ).resolves.toBe('ok');
    });

    it('propagates the rejection of the promise', async () => {
      await expect(
        Deadline.after(1_000, clock).wait(Promise.reject(new Error('boom'))),
      ).rejects.toThrow('boom');
    });

    it('rejects with DeadlineExceededError when the time runs out', async () => {
      const pending = Deadline.after(1_000, clock).wait(
        new Promise(() => undefined),
      );
      const assertion = expect(pending).rejects.toBeInstanceOf(
        DeadlineExceededError,
      );
      jest.advanceTimersByTime(1_000);
      await assertion;
    });

    it('rejects at once when the deadline already expired', async () => {
      const expired = Deadline.at(START.getTime() - 1, clock);
      await expect(
        expired.wait(Promise.reject(new Error('ignored'))),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
    });

    it('rejects with the reason of the signal', async () => {
      const controller = new AbortController();
      const pending = Deadline.after(1_000, clock).wait(
        new Promise(() => undefined),
        controller.signal,
      );
      controller.abort(new Error('stop'));
      await expect(pending).rejects.toThrow('stop');
    });

    it('rejects at once when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort(new Error('stop'));
      await expect(
        Deadline.after(1_000, clock).wait(
          Promise.resolve(1),
          controller.signal,
        ),
      ).rejects.toThrow('stop');
    });
  });

  describe('race', () => {
    it('gives the work a live signal and returns its result', async () => {
      const result = await Deadline.after(1_000, clock).race((signal) =>
        Promise.resolve(signal.aborted),
      );
      expect(result).toBe(false);
    });

    it('aborts the work signal when the time runs out', async () => {
      let seen: AbortSignal | undefined;
      const pending = Deadline.after(1_000, clock).race((signal) => {
        seen = signal;
        return new Promise(() => undefined);
      });
      const assertion = expect(pending).rejects.toBeInstanceOf(
        DeadlineExceededError,
      );
      await jest.advanceTimersByTimeAsync(1_000);
      await assertion;
      expect(seen?.aborted).toBe(true);
    });

    it('aborts the work signal when the caller aborts', async () => {
      const controller = new AbortController();
      let seen: AbortSignal | undefined;
      const pending = Deadline.after(1_000, clock).race((signal) => {
        seen = signal;
        return new Promise(() => undefined);
      }, controller.signal);
      await Promise.resolve();
      controller.abort(new Error('stop'));
      await expect(pending).rejects.toThrow('stop');
      expect(seen?.aborted).toBe(true);
    });

    it('does not start the work when already expired or aborted', async () => {
      let started = 0;
      const work = (): Promise<number> => {
        started += 1;
        return Promise.resolve(1);
      };
      await expect(
        Deadline.at(START.getTime() - 1, clock).race(work),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
      const controller = new AbortController();
      controller.abort(new Error('stop'));
      await expect(
        Deadline.after(1_000, clock).race(work, controller.signal),
      ).rejects.toThrow('stop');
      expect(started).toBe(0);
    });

    it('propagates a failure of the work', async () => {
      await expect(
        Deadline.after(1_000, clock).race(() =>
          Promise.reject(new Error('boom')),
        ),
      ).rejects.toThrow('boom');
    });
  });

  describe('sleep', () => {
    it('resolves after the given time', async () => {
      const sleeping = Deadline.after(5_000, clock).sleep(100);
      await jest.advanceTimersByTimeAsync(100);
      await expect(sleeping).resolves.toBeUndefined();
    });

    it('rejects when the deadline comes first', async () => {
      const sleeping = Deadline.after(50, clock).sleep(100);
      const assertion = expect(sleeping).rejects.toBeInstanceOf(
        DeadlineExceededError,
      );
      await jest.advanceTimersByTimeAsync(50);
      await assertion;
    });

    it('rejects when the signal aborts', async () => {
      const controller = new AbortController();
      const sleeping = Deadline.after(5_000, clock).sleep(
        100,
        controller.signal,
      );
      await Promise.resolve();
      controller.abort(new Error('stop'));
      await expect(sleeping).rejects.toThrow('stop');
    });

    it('rejects an invalid duration', () => {
      expect(() => Deadline.after(5_000, clock).sleep(-1)).toThrow(
        InvalidArgumentError,
      );
    });
  });
});
