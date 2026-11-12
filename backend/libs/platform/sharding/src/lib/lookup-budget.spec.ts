import { FixedClock } from '@platform/kernel/testing';
import { Deadline, DeadlineExceededError } from '@platform/primitives';
import { LookupBudget } from './lookup-budget.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('LookupBudget', () => {
  it('returns the same promise when there is no budget', () => {
    const promise = Promise.resolve(1);
    expect(new LookupBudget().wait(promise)).toBe(promise);
  });

  it('passes through the value and the error of the promise', async () => {
    const clock = new FixedClock();
    const budget = new LookupBudget(Deadline.after(60_000, clock));
    await expect(budget.wait(Promise.resolve('ok'))).resolves.toBe('ok');
    const failure = new Error('boom');
    await expect(budget.wait(Promise.reject(failure))).rejects.toBe(failure);
  });

  it('check throws the abort reason or a deadline error', () => {
    const clock = new FixedClock();
    const reason = new Error('cancelled');
    expect(() =>
      new LookupBudget(undefined, AbortSignal.abort(reason)).check(),
    ).toThrow(reason);
    expect(() => new LookupBudget(Deadline.after(0, clock)).check()).toThrow(
      DeadlineExceededError,
    );
    expect(() =>
      new LookupBudget(
        Deadline.after(1, clock),
        new AbortController().signal,
      ).check(),
    ).not.toThrow();
  });

  it('rejects at once when the signal is already aborted', async () => {
    const reason = new Error('cancelled');
    const budget = new LookupBudget(undefined, AbortSignal.abort(reason));
    await expect(budget.wait(new Promise(() => undefined))).rejects.toBe(
      reason,
    );
  });

  it('rejects when the signal aborts while waiting', async () => {
    const controller = new AbortController();
    const pending = deferred<string>();
    const waiting = new LookupBudget(undefined, controller.signal).wait(
      pending.promise,
    );
    const reason = new Error('client went away');
    controller.abort(reason);
    await expect(waiting).rejects.toBe(reason);
    // The shared work keeps going and a late rejection is handled.
    pending.reject(new Error('late'));
  });

  it('rejects at once with DeadlineExceededError when the deadline already passed', async () => {
    const clock = new FixedClock();
    const deadline = Deadline.after(10, clock);
    clock.advance(10);
    await expect(
      new LookupBudget(deadline).wait(new Promise(() => undefined)),
    ).rejects.toBeInstanceOf(DeadlineExceededError);
  });

  it('rejects with DeadlineExceededError when the deadline passes while waiting', async () => {
    const deadline = Deadline.after(5, new FixedClock());
    const error = await new LookupBudget(deadline)
      .wait(new Promise(() => undefined))
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(DeadlineExceededError);
    expect((error as DeadlineExceededError).details).toEqual({
      deadlineAtMs: deadline.atMs,
    });
  });

  it('clears its timer and listener once the promise settles', async () => {
    const clearSpy = jest.spyOn(globalThis, 'clearTimeout');
    const controller = new AbortController();
    const removeSpy = jest.spyOn(controller.signal, 'removeEventListener');
    const budget = new LookupBudget(
      Deadline.after(60_000, new FixedClock()),
      controller.signal,
    );
    await budget.wait(Promise.resolve(1));
    expect(clearSpy).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledWith('abort', expect.any(Function));
    clearSpy.mockRestore();
  });
});
