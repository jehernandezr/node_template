import { ShardingError, ShardingErrorCode } from './errors.js';
import { TransactionShardGuard } from './transaction-shard-guard.js';

describe('TransactionShardGuard', () => {
  it('allows touching the same shard repeatedly', () => {
    const guard = new TransactionShardGuard();
    expect(() => {
      guard.touch('shard-1');
      guard.touch('shard-1');
    }).not.toThrow();
  });

  it('throws CrossShardTransaction when another shard is touched', () => {
    const guard = new TransactionShardGuard();
    guard.touch('shard-1');
    expect(() => guard.touch('shard-2')).toThrow(ShardingError);
    expect(() => guard.touch('shard-2')).toThrow(
      expect.objectContaining({
        code: ShardingErrorCode.CrossShardTransaction,
      }),
    );
  });

  it('allows a new shard after reset', () => {
    const guard = new TransactionShardGuard();
    guard.touch('shard-1');
    guard.reset();
    expect(() => guard.touch('shard-2')).not.toThrow();
    expect(() => guard.touch('shard-1')).toThrow(ShardingError);
  });

  it('exposes no guard outside run()', () => {
    expect(TransactionShardGuard.current()).toBeUndefined();
  });

  it('gives each run its own guard, kept across awaits', async () => {
    const runFor = (shard: string) =>
      TransactionShardGuard.run(async () => {
        const guard = TransactionShardGuard.current();
        await new Promise((resolve) => setImmediate(resolve));
        expect(TransactionShardGuard.current()).toBe(guard);
        guard?.touch(shard);
        return guard;
      });

    const [first, second] = await Promise.all([
      runFor('shard-1'),
      runFor('shard-2'),
    ]);
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    expect(first).not.toBe(second);
  });

  it('rejects a second shard inside one run', async () => {
    await expect(
      TransactionShardGuard.run(async () => {
        TransactionShardGuard.current()?.touch('shard-1');
        await Promise.resolve();
        TransactionShardGuard.current()?.touch('shard-2');
      }),
    ).rejects.toMatchObject({ code: ShardingErrorCode.CrossShardTransaction });
  });

  it('starts a fresh guard in a nested run', () => {
    TransactionShardGuard.run(() => {
      TransactionShardGuard.current()?.touch('shard-1');
      TransactionShardGuard.run(() => {
        expect(() =>
          TransactionShardGuard.current()?.touch('shard-2'),
        ).not.toThrow();
      });
      expect(() => TransactionShardGuard.current()?.touch('shard-2')).toThrow(
        ShardingError,
      );
    });
  });
});
