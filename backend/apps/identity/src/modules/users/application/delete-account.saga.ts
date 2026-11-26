import {
  EraseUserOperation,
  IdentitySaga,
  SuspendUserOperation,
} from '@contracts/identity';
import { EraseNotificationsUserDataOperation } from '@contracts/notifications';
import { EraseReportsUserDataOperation } from '@contracts/reports';
import { EraseTasksUserDataOperation } from '@contracts/tasks';
import { SagaDefinition, type SagaFlow } from '@platform/saga';
import { UserSuspensionReason } from '../../../shared/enums/user-suspension-reason.enum.js';
import type { UserRef } from '../../../shared/types/user-ref.type.js';

/** The user that requested deleting their account. */
export interface DeleteAccountState {
  readonly user: UserRef;
}

/**
 * Account deletion (habeas data). Suspending is the only reversible step and goes first; from the pivot each
 * service deletes its own data, and repeating a step changes nothing. Identity deletes the user at the end, when no one
 * else needs to find them. Invoices belong to the tenant and billing deletes nothing.
 */
export class DeleteAccountSaga extends SagaDefinition<DeleteAccountState> {
  readonly type = IdentitySaga.DeleteAccount;

  protected override define(flow: SagaFlow<DeleteAccountState>): void {
    flow
      .step(SuspendUserOperation)
      .input((state) => ({
        userId: state.user.userId,
        reason: UserSuspensionReason.AccountDeletion,
      }))
      .compensationInput((state) => ({ userId: state.user.userId }))
      .pivot()
      .step(EraseTasksUserDataOperation)
      .input((state) => ({ user: state.user }))
      .step(EraseNotificationsUserDataOperation)
      .input((state) => ({ user: state.user }))
      .step(EraseReportsUserDataOperation)
      .input((state) => ({ user: state.user }))
      .step(EraseUserOperation)
      .input((state) => ({ userId: state.user.userId }));
  }
}
