import { Injectable } from '@nestjs/common';
import {
  EraseNotificationsUserDataOperation,
  type EraseNotificationsUserInput,
  type EraseNotificationsUserResult,
} from '@contracts/notifications';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { UserShard } from '../../../shared/utils/user-shard.js';
import { DeliveryRepository } from '../../dispatch/index.js';
import { InboxFacade } from '../../inbox/index.js';
import { PreferencesFacade } from '../../preferences/index.js';

/** Borrado de los datos de notificaciones de un usuario. */
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
}
