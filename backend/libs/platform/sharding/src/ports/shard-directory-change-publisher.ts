import type { ShardDirectoryChanged } from '../model/shard-directory-changed.js';

/**
 * Publica los cambios del directorio a todos los procesos del servicio. La
 * entrega es como máximo una vez: un mensaje perdido lo cubren la lápida del
 * caché compartido y el TTL en proceso.
 */
export abstract class ShardDirectoryChangePublisher {
  abstract publish(event: ShardDirectoryChanged): Promise<void>;
}
