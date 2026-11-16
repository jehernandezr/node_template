import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';
import type { ValkeyConnectionOpener } from '../valkey-subscriber-connection.js';
import { FakePubSubBroker } from './utils/index.js';

describe('ValkeySubscriberSource', () => {
  it('opens no connection until it is asked for one', async () => {
    const broker = new FakePubSubBroker();
    const source = new ValkeySubscriberSource(broker.opener);
    await source.close();
    expect(broker.opened).toBe(0);
    expect(broker.quits).toBe(0);
  });

  it('gives the same connection on every call', async () => {
    const broker = new FakePubSubBroker();
    const source = new ValkeySubscriberSource(broker.opener);
    const [first, second] = await Promise.all([
      source.connection(),
      source.connection(),
    ]);
    expect(first).toBe(second);
    expect(broker.opened).toBe(1);
  });

  it('quits the connection on close, once', async () => {
    const broker = new FakePubSubBroker();
    const source = new ValkeySubscriberSource(broker.opener);
    await source.connection();
    await source.close();
    await source.close();
    expect(broker.quits).toBe(1);
    expect(broker.disconnects).toBe(0);
  });

  it('cuts the connection when quit fails', async () => {
    const broker = new FakePubSubBroker();
    broker.quitFails = true;
    const source = new ValkeySubscriberSource(broker.opener);
    await source.connection();
    await source.close();
    expect(broker.disconnects).toBe(1);
  });

  it('opens again after an attempt failed', async () => {
    const broker = new FakePubSubBroker();
    let attempts = 0;
    const opener: ValkeyConnectionOpener = {
      create: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('refused');
        }
        return broker.opener.create();
      },
    };
    const source = new ValkeySubscriberSource(opener);
    await expect(source.connection()).rejects.toThrow('refused');
    await expect(source.connection()).resolves.toBeDefined();
    expect(attempts).toBe(2);
    await source.close();
    expect(broker.quits).toBe(1);
  });

  it('closes quietly when the connection never opened', async () => {
    const opener: ValkeyConnectionOpener = {
      create: async () => {
        throw new Error('refused');
      },
    };
    const source = new ValkeySubscriberSource(opener);
    await source.connection().catch(() => undefined);
    await expect(source.close()).resolves.toBeUndefined();
  });
});
