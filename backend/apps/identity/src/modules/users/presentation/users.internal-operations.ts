import { InternalHandler } from '@platform/internal-api/nest';
import {
  SuspendUserOperation,
  ReactivateUserOperation,
  GetUserProfileOperation,
  EraseUserOperation,
  ListPushTargetsOperation,
} from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

/** Operaciones internas de users. El arranque exige un handler por cada operación del contrato, así que responden como no implementadas hasta tener su caso de uso. */
export class UsersInternalOperations {
  @InternalHandler(SuspendUserOperation)
  suspendUser(): never {
    throw new RouteNotImplementedError(SuspendUserOperation.id);
  }

  @InternalHandler(ReactivateUserOperation)
  reactivateUser(): never {
    throw new RouteNotImplementedError(ReactivateUserOperation.id);
  }

  @InternalHandler(GetUserProfileOperation)
  getUserProfile(): never {
    throw new RouteNotImplementedError(GetUserProfileOperation.id);
  }

  @InternalHandler(EraseUserOperation)
  eraseUser(): never {
    throw new RouteNotImplementedError(EraseUserOperation.id);
  }

  @InternalHandler(ListPushTargetsOperation)
  listPushTargets(): never {
    throw new RouteNotImplementedError(ListPushTargetsOperation.id);
  }
}
