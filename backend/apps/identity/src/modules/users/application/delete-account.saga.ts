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

/** El usuario que pidió borrar su cuenta. */
export interface DeleteAccountState {
  readonly user: UserRef;
}

/**
 * Borrado de cuenta (habeas data). Suspender es el único paso reversible y va primero; desde el pivote cada
 * servicio borra lo suyo, y repetir un paso no cambia nada. Identity borra al usuario al final, cuando nadie
 * más necesita encontrarlo. Las facturas son del tenant y billing no borra nada.
 */
export class DeleteAccountSaga extends SagaDefinition<DeleteAccountState> {
  readonly type = IdentitySaga.DeleteAccount;

  protected define(flow: SagaFlow<DeleteAccountState>): void {
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
