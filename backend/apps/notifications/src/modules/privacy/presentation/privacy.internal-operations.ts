import { Injectable } from '@nestjs/common';
import {
  EraseNotificationsUserDataOperation,
  type EraseNotificationsUserInput,
  type EraseNotificationsUserResult,
} from '@contracts/notifications';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { DispatchFacade } from '../../dispatch/index.js';
import { InboxFacade } from '../../inbox/index.js';
import { PreferencesFacade } from '../../preferences/index.js';

/** Deletion of a user's notification data. */
@Injectable()
export class PrivacyInternalOperations {
  constructor(
    private readonly inbox: InboxFacade,
    private readonly preferences: PreferencesFacade,
    private readonly dispatch: DispatchFacade,
  ) {}

  /** Repeating it changes nothing: nothing of the user remains. */
  @InternalHandler(EraseNotificationsUserDataOperation)
  async eraseUserData(
    input: EraseNotificationsUserInput,
  ): Promise<HandlerResult<EraseNotificationsUserResult>> {
    const deliveries = await this.dispatch.eraseUser(input.user);
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
