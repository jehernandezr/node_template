import { Bulkhead } from '../bulkhead.js';

class Full extends Error {}

interface Gate {
  readonly promise: Promise<string>;
  open(value: string): void;
}

function gate(): Gate {
  let open: (value: string) => void = () => undefined;
  const promise = new Promise<string>((resolve) => {
    open = resolve;
  });
  return { promise, open };
}

function setup(limit: number, queue: number) {
  const onReject = jest.fn();
  const bulkhead = new Bulkhead({
    limit,
    queue,
    rejectWith: () => new Full(),
    onReject,
  });
  return { bulkhead, onReject };
}

describe('Bulkhead', () => {
  it('runs up to limit calls at once and queues the rest in order', async () => {
    const { bulkhead } = setup(1, 2);
    const first = gate();
    const started: string[] = [];
    const run = (name: string, g?: Gate) =>
      bulkhead.execute(async () => {
        started.push(name);
        return g === undefined ? name : g.promise;
      });

    const a = run('a', first);
    const b = run('b');
    const c = run('c');
    await Promise.resolve();
    expect(started).toEqual(['a']);

    first.open('a');
    await expect(Promise.all([a, b, c])).resolves.toEqual(['a', 'b', 'c']);
    expect(started).toEqual(['a', 'b', 'c']);
  });

  it('rejects at once when there is no slot nor queue room', async () => {
    const { bulkhead, onReject } = setup(1, 0);
    const busy = gate();
    const running = bulkhead.execute(() => busy.promise);
    await expect(bulkhead.execute(async () => 'late')).rejects.toBeInstanceOf(
      Full,
    );
    expect(onReject).toHaveBeenCalledTimes(1);
    busy.open('done');
    await running;
    await expect(bulkhead.execute(async () => 'free')).resolves.toBe('free');
  });

  it('frees the slot when the call throws', async () => {
    const { bulkhead } = setup(1, 0);
    await expect(
      bulkhead.execute(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(bulkhead.execute(async () => 'ok')).resolves.toBe('ok');
  });

  it('drops a queued call whose signal aborts and keeps the queue moving', async () => {
    const { bulkhead } = setup(1, 2);
    const busy = gate();
    const running = bulkhead.execute(() => busy.promise);
    const controller = new AbortController();
    const fn = jest.fn(async () => 'never');
    const queued = bulkhead.execute(fn, controller.signal);
    const next = bulkhead.execute(async () => 'next');

    const reason = new Error('caller gave up');
    controller.abort(reason);
    await expect(queued).rejects.toBe(reason);

    busy.open('done');
    await expect(running).resolves.toBe('done');
    await expect(next).resolves.toBe('next');
    expect(fn).not.toHaveBeenCalled();
  });
});
