import { CacheInvalidArgumentError, CachePort } from '@platform/cache';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/**
 * `CachePort` sobre Valkey. Cada operación es un comando atómico: `GET`,
 * `SET ... PX` (TTL), `SET ... NX` (`setIfAbsent`) y `DEL`. Las llaves quedan
 * como `<prefijo>:<llave>`, dentro de la ACL del usuario del servicio. Las
 * fallas son `ValkeyCommandError`, clasificadas para que el breaker del caché
 * abra cuando Valkey está caído.
 */
export class ValkeyCache extends CachePort {
  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
  ) {
    super();
  }

  async get(key: string): Promise<string | undefined> {
    return this.executor.optionalString(
      ValkeyCommand.Get,
      await this.executor.run(ValkeyCommand.Get, [this.keyOf(key)]),
    );
  }

  /**
   * Un TTL se redondea hacia arriba a milisegundos enteros; un TTL de 0 borra
   * la llave, como una entrada que vence al instante.
   * @throws CacheInvalidArgumentError con un TTL negativo o no finito.
   */
  async set(key: string, value: string, ttlMs?: number): Promise<void> {
    if (ttlMs === undefined) {
      await this.executor.run(ValkeyCommand.Set, [this.keyOf(key), value]);
      return;
    }
    if (!Number.isFinite(ttlMs) || ttlMs < 0) {
      throw new CacheInvalidArgumentError('ttlMs', 'a finite number >= 0');
    }
    const px = Math.ceil(ttlMs);
    if (px === 0) {
      await this.delete(key);
      return;
    }
    await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(key),
      value,
      'PX',
      px,
    ]);
  }

  async setIfAbsent(key: string, value: string): Promise<boolean> {
    const reply = await this.executor.run(ValkeyCommand.Set, [
      this.keyOf(key),
      value,
      'NX',
    ]);
    return reply === 'OK';
  }

  async delete(key: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [this.keyOf(key)]);
  }

  private keyOf(key: string): string {
    return this.keyspace.key(key);
  }
}
