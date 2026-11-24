import { TenantWriteGate } from '@platform/sharding';
import { ValkeyCommand } from './valkey-command.enum.js';
import type { ValkeyCommandExecutor } from './valkey-command-executor.js';
import type { ValkeyKeyspace } from './valkey-keyspace.js';

/**
 * Compuerta de escritura en Valkey: cerrar es crear `<prefijo>:tenant-write-gate:<tenant>`. No toca el
 * directorio, así que sirve cuando otro proceso es dueño del placement. Cada servicio cierra la suya, porque
 * la ACL de cada uno solo alcanza su prefijo. La llave no vence: solo la abre el traslado que la cerró, al
 * cambiar de directorio o al cancelarse. Cada transacción de escritura del servicio consulta la llave con un
 * `EXISTS`; la garantía de que nada llegue tarde al origen la da la barrera del shard, no esta consulta.
 */
export class ValkeyWriteGate extends TenantWriteGate {
  private static readonly KEY_TAG = 'tenant-write-gate';

  constructor(
    private readonly executor: ValkeyCommandExecutor,
    private readonly keyspace: ValkeyKeyspace,
  ) {
    super();
  }

  async isClosed(tenantId: string): Promise<boolean> {
    const reply = await this.executor.run(ValkeyCommand.Exists, [
      this.keyOf(tenantId),
    ]);
    return Number(reply) > 0;
  }

  async close(tenantId: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Set, [this.keyOf(tenantId), '1']);
  }

  async open(tenantId: string): Promise<void> {
    await this.executor.run(ValkeyCommand.Del, [this.keyOf(tenantId)]);
  }

  private keyOf(tenantId: string): string {
    return this.keyspace.key(ValkeyWriteGate.KEY_TAG, tenantId);
  }
}
