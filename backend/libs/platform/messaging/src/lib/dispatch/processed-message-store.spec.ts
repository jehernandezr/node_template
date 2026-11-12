import { InMemoryProcessedMessageStore } from './processed-message-store.js';

describe('InMemoryProcessedMessageStore', () => {
  it('claims atomically: the second claim of the same key fails', async () => {
    const store = new InMemoryProcessedMessageStore();
    const results = await Promise.all([
      store.claim('audit', 'm1'),
      store.claim('audit', 'm1'),
    ]);
    expect(results.sort()).toEqual([false, true]);
  });

  it('scopes claims by consumer', async () => {
    const store = new InMemoryProcessedMessageStore();
    expect(await store.claim('audit', 'm1')).toBe(true);
    expect(await store.claim('notifications', 'm1')).toBe(true);
  });

  it('releases a claim so it can be claimed again', async () => {
    const store = new InMemoryProcessedMessageStore();
    await store.claim('audit', 'm1');
    await store.release('audit', 'm1');
    expect(await store.claim('audit', 'm1')).toBe(true);
  });
});
