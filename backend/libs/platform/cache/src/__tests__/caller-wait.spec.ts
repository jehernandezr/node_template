import { SystemClock } from '@platform/kernel';
import { FixedClock } from '@platform/kernel/test-utils';
import { Deadline, PrimitivesErrorCode } from '@platform/primitives';
import { CallerWait } from '../caller-wait.js';

describe('CallerWait', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the same promise when the caller sets no limits', () => {
    const work = Promise.resolve('value');
    const wait = new CallerWait(new FixedClock());
    expect(wait.wait(work, {})).toBe(work);
  });

  it('rejects with the abort reason when the signal is already aborted', async () => {
    const reason = new Error('client left');
    const controller = new AbortController();
    controller.abort(reason);
    const wait = new CallerWait(new FixedClock());
    await expect(
      wait.wait(new Promise<never>(() => undefined), {
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
  });

  it('rejects with DeadlineExceededError when the deadline already passed', async () => {
    const clock = new FixedClock();
    const deadline = Deadline.after(100, clock);
    clock.advance(100);
    const wait = new CallerWait(clock);
    await expect(
      wait.wait(new Promise<never>(() => undefined), { deadline }),
    ).rejects.toMatchObject({ code: PrimitivesErrorCode.DeadlineExceeded });
  });

  it('gives up mid-wait when the deadline expires while the work is pending', async () => {
    jest.useFakeTimers();
    const clock = new SystemClock();
    const wait = new CallerWait(clock);
    const outcome = wait
      .wait(new Promise<never>(() => undefined), {
        deadline: Deadline.after(50, clock),
      })
      .catch((error: unknown) => error);

    await jest.advanceTimersByTimeAsync(50);

    await expect(outcome).resolves.toMatchObject({
      code: PrimitivesErrorCode.DeadlineExceeded,
    });
  });

  it('leaves the work running after the caller gives up', async () => {
    const controller = new AbortController();
    const wait = new CallerWait(new FixedClock());
    let finish: (value: string) => void = () => undefined;
    const work = new Promise<string>((resolve) => {
      finish = (value: string): void => resolve(value);
    });

    const caller = wait.wait(work, { signal: controller.signal });
    controller.abort(new Error('stop'));
    await expect(caller).rejects.toThrow('stop');

    finish('done');
    await expect(wait.wait(work, {})).resolves.toBe('done');
  });
});
