import { ShardDirectoryChangeKind } from './model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from './model/shard-directory-changed.js';
import { ShardingEvent } from './model/sharding-event.enum.js';

/** Serializa y valida los cambios del directorio que viajan por un canal de texto (Valkey pub/sub, una cola). */
export class ShardDirectoryChangeCodec {
  /** Longitud máxima de un id en un mensaje de cambio. Los ids son UUIDv7 o nombres de shard. */
  private static readonly MAX_ID_LENGTH = 256;

  static encode(event: ShardDirectoryChanged): string {
    return JSON.stringify(event);
  }

  /**
   * Interpreta y valida un cambio recibido de un canal. Todo lo malformado
   * devuelve `undefined`, así un mensaje malo se ignora en vez de invalidar al tenant equivocado.
   */
  static decode(raw: string): ShardDirectoryChanged | undefined {
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return undefined;
    }
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return undefined;
    }
    const record = data as Record<string, unknown>;
    if (record['type'] !== ShardingEvent.ShardDirectoryChanged) {
      return undefined;
    }
    if (record['kind'] === ShardDirectoryChangeKind.ShardInstance) {
      const logicalShard = record['logicalShard'];
      return ShardDirectoryChangeCodec.isId(logicalShard)
        ? {
            type: ShardingEvent.ShardDirectoryChanged,
            kind: ShardDirectoryChangeKind.ShardInstance,
            logicalShard,
          }
        : undefined;
    }
    if (record['kind'] !== ShardDirectoryChangeKind.TenantPlacement) {
      return undefined;
    }
    const { tenantId, version } = record;
    if (!ShardDirectoryChangeCodec.isId(tenantId)) {
      return undefined;
    }
    if (version === undefined) {
      return {
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId,
      };
    }
    if (
      typeof version !== 'number' ||
      !Number.isSafeInteger(version) ||
      version < 0
    ) {
      return undefined;
    }
    return {
      type: ShardingEvent.ShardDirectoryChanged,
      kind: ShardDirectoryChangeKind.TenantPlacement,
      tenantId,
      version,
    };
  }

  private static isId(value: unknown): value is string {
    return (
      typeof value === 'string' &&
      value.length > 0 &&
      value.length <= ShardDirectoryChangeCodec.MAX_ID_LENGTH
    );
  }
}
