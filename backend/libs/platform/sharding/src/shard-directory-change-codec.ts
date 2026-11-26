import { ShardDirectoryChangeKind } from './model/shard-directory-change-kind.enum.js';
import type { ShardDirectoryChanged } from './model/shard-directory-changed.js';
import { ShardingEvent } from './model/sharding-event.enum.js';

/** Serializes and validates directory changes that travel over a text channel (Valkey pub/sub, a queue). */
export class ShardDirectoryChangeCodec {
  /** Maximum length of an id in a change message. Ids are UUIDv7 or shard names. */
  private static readonly MAX_ID_LENGTH = 256;

  /**
   * Encodes a directory change for a channel.
   * @param event Directory change.
   * @returns The text.
   */
  static encode(event: ShardDirectoryChanged): string {
    return JSON.stringify(event);
  }

  /**
   * Parses and validates a change received from a channel. Anything malformed
   * returns `undefined`, so a bad message is ignored instead of invalidating the wrong tenant.
   * @param raw Text from the channel.
   * @returns The change, or `undefined`.
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
