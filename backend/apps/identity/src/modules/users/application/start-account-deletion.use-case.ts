import { Injectable } from '@nestjs/common';
import { IdentitySaga, type AccountDeletionStarted } from '@contracts/identity';
import { IdGenerator } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../access/index.js';
import { IdentitySagas } from '../../sagas/index.js';
import { DeleteAccountSaga } from './delete-account.saga.js';

/**
 * `POST /v1/me/deletion`: starts `DeleteAccount` for the user, in the shard of their home tenant. There is no
 * grace period: the account is suspended and deleted at once. The user's departure from each tenant is reserved
 * first, so the last owner of a tenant with other members is refused until they hand over ownership, also when
 * another owner is being deleted at the same time. A saga that does not start gives back only the departures
 * this request reserved, so those of an earlier request whose saga is still running stay.
 */
@Injectable()
export class StartAccountDeletion {
  constructor(
    private readonly sagas: IdentitySagas,
    private readonly access: AccessFacade,
    private readonly ids: IdGenerator,
  ) {}

  /**
   * Launches the saga that erases the account in every service, after checking that no tenant is left without an
   * owner.
   * @param user User whose account is deleted.
   * @returns The saga that deletes it.
   * @throws IdentityError `IDENTITY.ACCESS.LAST_OWNER` if they are the last owner of a tenant with other members.
   */
  async execute(user: UserRef): Promise<AccountDeletionStarted> {
    const reserved = await this.access.reserveDepartures(user);
    const sagaId = this.ids.next().toString();
    try {
      await this.sagas.start({
        definition: DeleteAccountSaga,
        saga: IdentitySaga.DeleteAccount,
        sagaId,
        tenantId: user.homeTenantId,
        requestedBy: user.userId,
        state: { user },
      });
    } catch (error) {
      await this.access.releaseDepartures(user, reserved);
      throw error;
    }
    return { sagaId };
  }
}
