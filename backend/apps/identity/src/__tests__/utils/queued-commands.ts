import type { IdentityCommand } from '@contracts/identity';
import { MessageDispatcher } from '@platform/messaging';
import type { IdentityTestApp } from './identity-test-app.js';

/** The commands identity queued for itself in its outboxes, delivered to its dispatcher as the worker would. */
export class QueuedCommands {
  constructor(private readonly app: IdentityTestApp) {}

  /**
   * Delivers every queued command of a type that names an email, in every shard. A command delivered before
   * answers as a duplicate.
   * @param type Command type.
   * @param email Email the command carries.
   */
  async deliver(type: IdentityCommand, email: string): Promise<void> {
    const probe = this.app.shards();
    const query = `SELECT envelope FROM outbox WHERE envelope->>'type' = '${type}' AND envelope->'data'->>'email' = '${email}'`;
    for (const shard of await probe.shardsWith(query)) {
      const rows = await probe.rowsIn<{ envelope: unknown }>(shard, query);
      for (const { envelope } of rows) {
        await this.app
          .get(MessageDispatcher)
          .dispatch(envelope, { receiveCount: 1 });
      }
    }
  }
}
