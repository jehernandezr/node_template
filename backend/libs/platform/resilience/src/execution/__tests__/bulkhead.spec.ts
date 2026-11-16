import { Bulkhead } from '../bulkhead.js';
import { Deferred, Flush } from '../../__tests__/utils/index.js';

function bulkhead(
  limit: number,
  queue: number,
  onReject?: () => void,
): Bulkhead {
  return new Bulkhead({
    limit,
    queue,
    rejectWith: () => new Error('full'),
    onReject,
  });
}

describe('Bulkhead', () => {
  it('runs up to limit calls at once and queues the rest in order', async () => {
    const limiter = bulkhead(1, 2);
    const order: string[] = [];
    const gate = new Deferred<void>();
    const first = limiter.execute(async () => {
      order.push('first');
      await gate.promise;
    });
    const second = limiter.execute(async () => {
      order.push('second');
    });
    await Flush.macrotask();
    expect(order).toEqual(['first']);
    gate.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(['first', 'second']);
  });

  it('rejects at once when there is no slot nor queue room and reports it', async () => {
    let rejected = 0;
    const limiter = bulkhead(1, 0, () => {
      rejected += 1;
    });
    const gate = new Deferred<void>();
    const first = limiter.execute(() => gate.promise);
    await expect(limiter.execute(async () => 'x')).rejects.toThrow('full');
    expect(rejected).toBe(1);
    gate.resolve();
    await first;
  });

  it('frees the slot when the call throws', async () => {
    const limiter = bulkhead(1, 0);
    await expect(
      limiter.execute(async () => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(limiter.execute(async () => 'next')).resolves.toBe('next');
  });

  it('drops a queued call whose signal aborts and keeps the queue moving', async () => {
    const limiter = bulkhead(1, 2);
    const gate = new Deferred<void>();
    const first = limiter.execute(() => gate.promise);
    const controller = new AbortController();
    const dropped = limiter.execute(async () => 'dropped', controller.signal);
    const kept = limiter.execute(async () => 'kept');
    await Flush.macrotask();
    controller.abort(new Error('left queue'));
    await expect(dropped).rejects.toThrow('left queue');
    gate.resolve();
    await first;
    await expect(kept).resolves.toBe('kept');
  });

  it('rejects a queued call that arrives already aborted', async () => {
    const limiter = bulkhead(1, 1);
    const gate = new Deferred<void>();
    const first = limiter.execute(() => gate.promise);
    const controller = new AbortController();
    controller.abort(new Error('before wait'));
    await expect(
      limiter.execute(async () => 'x', controller.signal),
    ).rejects.toThrow('before wait');
    gate.resolve();
    await first;
  });
});
