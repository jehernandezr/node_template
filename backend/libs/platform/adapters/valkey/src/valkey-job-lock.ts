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
 * `JobLock` entre procesos sobre Valkey. Toma el lock con `SET NX PX` y un
 * token aleatorio; solo quien tiene el token lo libera (compare-and-delete en
 * un script), así un lease vencido no quita el lock de quien lo tomó después.
 * Las llaves son `<prefijo>:joblock:<nombre>`.
 */
export class ValkeyJobLock extends JobLock {
  private static readonly TOKEN_BYTES = 16;

  /** KEYS[1] llave del lock; ARGV[1] token. Borra solo si el token coincide. */
  private static readonly RELEASE = new LuaScript(`
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
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

  /** @throws GuardViolationError con un nombre vacío o un `ttlMs` que no sea un entero positivo. */
  async tryAcquire(name: string, ttlMs: number): Promise<JobLease | undefined> {
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

  async release(lease: JobLease): Promise<void> {
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
