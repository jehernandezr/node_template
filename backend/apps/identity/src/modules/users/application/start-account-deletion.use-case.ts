import { Injectable } from '@nestjs/common';
import { IdentitySaga, type AccountDeletionStarted } from '@contracts/identity';
import { IdGenerator } from '@platform/kernel';
import type { UserRef } from '../../../shared/types/user-ref.type.js';
import { IdentitySagas } from '../../sagas/index.js';
import { DeleteAccountSaga } from './delete-account.saga.js';

/**
 * `POST /v1/me/deletion`: arranca `DeleteAccount` para el usuario, en el shard de su tenant de origen. Sin
 * periodo de gracia: la cuenta se suspende y se borra en el acto.
 */
@Injectable()
export class StartAccountDeletion {
  constructor(
    private readonly sagas: IdentitySagas,
    private readonly ids: IdGenerator,
  ) {}

  async execute(user: UserRef): Promise<AccountDeletionStarted> {
    const sagaId = this.ids.next().toString();
    await this.sagas.start({
      definition: DeleteAccountSaga,
      saga: IdentitySaga.DeleteAccount,
      sagaId,
      tenantId: user.homeTenantId,
      requestedBy: user.userId,
      state: { user },
    });
    return { sagaId };
  }
}
