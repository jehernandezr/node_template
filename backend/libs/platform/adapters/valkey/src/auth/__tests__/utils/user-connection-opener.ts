import type { Valkey } from 'iovalkey';
import type {
  ValkeyConnectionOpener,
  ValkeySubscriberClient,
} from '../../../valkey-subscriber-connection.js';

/** Abre las conexiones suscriptoras con un usuario concreto de Valkey. */
export class UserConnectionOpener implements ValkeyConnectionOpener {
  constructor(private readonly open: () => Valkey) {}

  async create(): Promise<ValkeySubscriberClient> {
    return this.open();
  }
}
