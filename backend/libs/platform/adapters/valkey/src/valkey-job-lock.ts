import {
  Guard,
  JobLock,
  type JobLease,
  type RandomSource,
} from '@platform/kernel';
import { LuaScript } from './lua-script.js';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/**
 * Cross-process `JobLock` on Valkey. It takes the lock with `SET NX PX` and a
 * random token; only the token holder releases it (compare-and-delete in
 * a script), so an expired lease does not remove the lock from whoever took it later.
 * The keys are `<prefix>:joblock:<name>`.
 */
export class ValkeyJobLock extends JobLock {
  private static readonly TOKEN_BYTES = 16;

  /** KEYS[1] lock key; ARGV[1] token. Deletes only if the token matches. */
  private static readonly RELEASE = new LuaScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`);

  /** KEYS[1] lock key; ARGV[1] token; ARGV[2] ttl in ms. Extends only if the token matches. */
  private static readonly RENEW = new LuaScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('PEXPIRE', KEYS[1], ARGV[2])
end
return 0
`);

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
    private readonly random: RandomSource,
  ) {
    super();
  }

  /** @throws GuardViolationError with an empty name or a `ttlMs` that is not a positive integer. */
  override async tryAcquire(
    name: string,
    ttlMs: number,
  ): Promise<JobLease | undefined> {
    Guard.default.nonEmpty('name', name);
    Guard.default.positiveInteger('ttlMs', ttlMs);
    const token = Buffer.from(
      this.random.bytes(ValkeyJobLock.TOKEN_BYTES),
    ).toString('hex');
    const reply = await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(name),
      token,
      'NX',
      'PX',
      ttlMs,
    ]);
    return reply === 'OK' ? { name, token } : undefined;
  }

  /**
   * Extends the key's expiry with a compare-and-expire script, so a lease that expired and was taken by
   * another process is never extended.
   * @throws GuardViolationError with a `ttlMs` that is not a positive integer.
   */
  override async renew(lease: JobLease, ttlMs: number): Promise<boolean> {
    Guard.default.positiveInteger('ttlMs', ttlMs);
    const reply = await this.executor.script(
      ValkeyJobLock.RENEW,
      [this.keyOf(lease.name)],
      [lease.token, ttlMs],
    );
    return reply === 1;
  }

  override async release(lease: JobLease): Promise<void> {
    await this.executor.script(
      ValkeyJobLock.RELEASE,
      [this.keyOf(lease.name)],
      [lease.token],
    );
  }

  private keyOf(name: string): string {
    return this.keyspace.key('joblock', name);
  }
}
