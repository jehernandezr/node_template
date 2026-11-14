import { AbortableWait } from '../abortable-wait.js';
import { Deferred, Flush } from '../../__tests__/utils/index.js';

describe('AbortableWait', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves with the work result when the signal stays quiet', async () => {
    const controller = new AbortController();
    await expect(
      AbortableWait.until(async () => 'value', controller.signal),
    ).resolves.toBe('value');
  });

  it('rejects with the reason when the signal aborts before the work ends', async () => {
    const controller = new AbortController();
    const blocker = new Deferred<string>();
    const outcome = AbortableWait.until(
      () => blocker.promise,
      controller.signal,
    );
    controller.abort(new Error('stop'));
    await expect(outcome).rejects.toThrow('stop');
    blocker.resolve('late');
  });

  it('does not run the work when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort(new Error('early'));
    let ran = false;
    await expect(
      AbortableWait.until(async () => {
        ran = true;
        return 'x';
      }, controller.signal),
    ).rejects.toThrow('early');
    expect(ran).toBe(false);
  });

  it('discards a late rejection of abandoned work', async () => {
    const controller = new AbortController();
    const blocker = new Deferred<void>();
    const outcome = AbortableWait.until(
      () => blocker.promise,
      controller.signal,
    );
    controller.abort(new Error('gone'));
    await expect(outcome).rejects.toThrow('gone');
    blocker.resolve();
    await Flush.macrotask();
  });

  it('sleeps for the given time on fake timers', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    let done = false;
    const sleeping = AbortableWait.sleep(100, controller.signal).then(() => {
      done = true;
    });
    await jest.advanceTimersByTimeAsync(99);
    expect(done).toBe(false);
    await jest.advanceTimersByTimeAsync(1);
    await sleeping;
    expect(done).toBe(true);
  });

  it('cancels the sleep and rejects when the signal aborts', async () => {
    jest.useFakeTimers();
    const controller = new AbortController();
    const sleeping = AbortableWait.sleep(1000, controller.signal);
    controller.abort(new Error('cancel'));
    await expect(sleeping).rejects.toThrow('cancel');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('rejects a sleep that starts with an aborted signal', async () => {
    const controller = new AbortController();
    controller.abort(new Error('already'));
    await expect(AbortableWait.sleep(10, controller.signal)).rejects.toThrow(
      'already',
    );
  });
});
