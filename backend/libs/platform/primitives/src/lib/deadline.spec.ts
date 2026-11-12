import { FixedClock } from '@platform/kernel/testing';
import { Deadline } from './deadline.js';
import {
  DeadlineExceededError,
  InvalidArgumentError,
  PrimitivesErrorCode,
} from './errors.js';

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
      expect(deadline.remaining()).toBe(1_000);
    });

    it('at() keeps the absolute instant', () => {
      const deadline = Deadline.at(START.getTime() + 250, clock);
      expect(deadline.remaining()).toBe(250);
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
      expect(deadline.remaining()).toBe(600);
      expect(deadline.isExpired()).toBe(false);
      clock.advance(600);
      expect(deadline.remaining()).toBe(0);
      expect(deadline.isExpired()).toBe(true);
      clock.advance(5_000);
      expect(deadline.remaining()).toBe(0);
    });

    it('throwIfExpired throws DeadlineExceededError only once expired', () => {
      const deadline = Deadline.after(10, clock);
      expect(() => deadline.throwIfExpired()).not.toThrow();
      clock.advance(10);
      expect(() => deadline.throwIfExpired()).toThrow(DeadlineExceededError);
      expect(() => deadline.throwIfExpired()).toThrow(
        expect.objectContaining({ code: PrimitivesErrorCode.DeadlineExceeded }),
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
      expect(parent.child(500).remaining()).toBe(100);
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
      const spy = jest.spyOn(globalThis, 'setTimeout');
      try {
        Deadline.after(60_000, new FixedClock()).toAbortSignal();
        const timer = spy.mock.results[0]?.value as NodeJS.Timeout;
        expect(timer.hasRef()).toBe(false);
        clearTimeout(timer);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
