import { Injectable } from '@nestjs/common';
import {
  EraseNotificationsUserDataOperation,
  notificationsContract,
  type EraseNotificationsUserInput,
  type EraseNotificationsUserResult,
} from '@contracts/notifications';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { OperationNotImplementedError } from '../../../shared/errors/operation-not-implemented.error.js';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { DeliveryRepository } from '../../dispatch/index.js';
import { InboxFacade } from '../../inbox/index.js';
import { PreferencesFacade } from '../../preferences/index.js';

/** Borrado de los datos de notificaciones de un usuario y, después, el traslado de tenants. */
@Injectable()
export class PrivacyInternalOperations {
  constructor(
    private readonly inbox: InboxFacade,
    private readonly preferences: PreferencesFacade,
    private readonly deliveries: DeliveryRepository,
    private readonly shard: UserShard,
  ) {}

  /** Repetirla no cambia nada: ya no queda nada del usuario. */
  @InternalHandler(EraseNotificationsUserDataOperation)
  async eraseUserData(
    input: EraseNotificationsUserInput,
  ): Promise<HandlerResult<EraseNotificationsUserResult>> {
    const deliveries = await this.shard.run(input.user, () =>
      this.deliveries.erase(input.user.userId),
    );
    const notifications = await this.inbox.erase(input.user);
    const preferences = await this.preferences.erase(input.user);
    return {
      outcome: CallOutcome.success({
        userId: input.user.userId,
        affectedRows: deliveries + notifications + preferences,
      }),
    };
  }

  @InternalHandler(notificationsContract.operations.tenantMoveSync)
  tenantMoveSync(): never {
    throw new OperationNotImplementedError(
      notificationsContract.operations.tenantMoveSync.id,
    );
  }

  @InternalHandler(notificationsContract.operations.tenantMoveFinalize)
  tenantMoveFinalize(): never {
    throw new OperationNotImplementedError(
      notificationsContract.operations.tenantMoveFinalize.id,
    );
  }

  @InternalHandler(notificationsContract.operations.tenantMoveAbort)
  tenantMoveAbort(): never {
    throw new OperationNotImplementedError(
      notificationsContract.operations.tenantMoveAbort.id,
    );
  }

  @InternalHandler(notificationsContract.operations.tenantMoveCleanup)
  tenantMoveCleanup(): never {
    throw new OperationNotImplementedError(
      notificationsContract.operations.tenantMoveCleanup.id,
    );
  }
}
