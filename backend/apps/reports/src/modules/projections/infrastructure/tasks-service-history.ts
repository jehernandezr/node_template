import { Injectable } from '@nestjs/common';
import type { Page } from '@contracts/platform';
import { ListTaskChangesOperation, type TaskChange } from '@contracts/tasks';
import { InternalClient } from '@platform/internal-api';
import { IdGenerator } from '@platform/kernel';
import { CallOutcomeKind } from '@platform/primitives';
import { PeerUnavailableError } from '../../../shared/errors/peer-unavailable.error.js';
import { TaskHistory } from '../domain/task-history.js';

/** La historia de tareas por la operación `tasks.tasks.list-changes.v1`. */
@Injectable()
export class TasksServiceHistory extends TaskHistory {
  constructor(
    private readonly client: InternalClient,
    private readonly ids: IdGenerator,
  ) {
    super();
  }

  /** @throws PeerUnavailableError si tasks no responde: el relleno sigue en la próxima corrida. */
  async page(
    tenantId: string,
    after: string | undefined,
    limit: number,
  ): Promise<Page<TaskChange>> {
    const outcome = await this.client.call(
      ListTaskChangesOperation,
      { tenantId, limit, ...(after === undefined ? {} : { after }) },
      { idempotencyKey: this.ids.next().toString() },
    );
    if (outcome.kind !== CallOutcomeKind.Success) {
      throw new PeerUnavailableError(ListTaskChangesOperation.id, outcome.kind);
    }
    return outcome.value;
  }
}
