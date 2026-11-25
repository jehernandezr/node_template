import type { Valkey } from 'iovalkey';
import type {
  ValkeyConnectionOpener,
  ValkeySubscriberClient,
} from '../../../valkey-subscriber-connection.js';

/** Opens the subscriber connections with a specific Valkey user. */
export class UserConnectionOpener implements ValkeyConnectionOpener {
  constructor(private readonly open: () => Valkey) {}

  async create(): Promise<ValkeySubscriberClient> {
    return this.open();
  }
}
