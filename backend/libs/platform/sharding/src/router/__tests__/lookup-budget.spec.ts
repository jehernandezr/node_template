import { FixedClock } from '@platform/kernel/test-utils';
import { Deadline, DeadlineExceededError } from '@platform/primitives';
import { Deferred } from '../../__tests__/utils/index.js';
import { LookupBudget } from '../lookup-budget.js';

describe('LookupBudget', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('wait without limits', () => {
    it('returns the same promise when there is no deadline or signal', () => {
      const clock = new FixedClock();
      const promise = Promise.resolve('value');

      expect(new LookupBudget(clock).wait(promise)).toBe(promise);
    });
  });

  describe('wait with a distant deadline', () => {
    it('passes the value and the error of the promise through', async () => {
      const clock = new FixedClock();
      const budget = new LookupBudget(clock, Deadline.after(60_000, clock));

      await expect(budget.wait(Promise.resolve('ok'))).resolves.toBe('ok');
      await expect(
        budget.wait(Promise.reject(new Error('boom'))),
      ).rejects.toThrow('boom');
    });
  });

  describe('wait with a signal', () => {
    it('rejects with the signal reason when it is already aborted', async () => {
      const clock = new FixedClock();
      const controller = new AbortController();
      controller.abort(new Error('cancelled'));
      const budget = new LookupBudget(clock, undefined, controller.signal);

      await expect(budget.wait(new Deferred<string>().promise)).rejects.toThrow(
        'cancelled',
      );
    });

    it('rejects with the signal reason when it aborts while waiting, and the shared work may still fail later', async () => {
      const clock = new FixedClock();
      const controller = new AbortController();
      const budget = new LookupBudget(clock, undefined, controller.signal);
      const shared = new Deferred<string>();

      const waiting = expect(budget.wait(shared.promise)).rejects.toThrow(
        'cancelled',
      );
      controller.abort(new Error('cancelled'));
      await waiting;
      shared.reject(new Error('shared work failed'));

      await expect(shared.promise).rejects.toThrow('shared work failed');
    });
  });

  describe('wait with a deadline', () => {
    it('rejects with DeadlineExceededError when the deadline has already passed', async () => {
      const clock = new FixedClock();
      const budget = new LookupBudget(clock, Deadline.after(0, clock));

      await expect(
        budget.wait(new Deferred<string>().promise),
      ).rejects.toBeInstanceOf(DeadlineExceededError);
    });

    it('rejects when the deadline passes while waiting, and the shared work keeps running', async () => {
      jest.useFakeTimers();
      const clock = new FixedClock();
      const deadline = Deadline.after(5, clock);
      const budget = new LookupBudget(clock, deadline);
      const shared = new Deferred<string>();

      const outcome = expect(budget.wait(shared.promise)).rejects.toMatchObject(
        { details: { deadlineAtMs: deadline.atMs } },
      );
      await jest.advanceTimersByTimeAsync(5);
      await outcome;
      shared.resolve('ok');

      await expect(shared.promise).resolves.toBe('ok');
    });
  });

  describe('check', () => {
    it('passes while the signal and the deadline are both live', () => {
      const clock = new FixedClock();
      const controller = new AbortController();
      const budget = new LookupBudget(
        clock,
        Deadline.after(60_000, clock),
        controller.signal,
      );

      expect(() => budget.check()).not.toThrow();
    });

    it('throws the signal reason when the signal is aborted', () => {
      const clock = new FixedClock();
      const controller = new AbortController();
      controller.abort(new Error('cancelled'));
      const budget = new LookupBudget(clock, undefined, controller.signal);

      expect(() => budget.check()).toThrow('cancelled');
    });

    it('throws DeadlineExceededError when the deadline has passed', () => {
      const clock = new FixedClock();
      const budget = new LookupBudget(clock, Deadline.after(0, clock));

      expect(() => budget.check()).toThrow(DeadlineExceededError);
    });
  });
});
