import { InternalHandler } from '@platform/internal-api/nest';
import {
  GetUserAccessOperation,
  ListMembersByPermissionOperation,
} from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

/** Operaciones internas de access. El arranque exige un handler por cada operación del contrato, así que responden como no implementadas hasta tener su caso de uso. */
export class AccessInternalOperations {
  @InternalHandler(GetUserAccessOperation)
  getUserAccess(): never {
    throw new RouteNotImplementedError(GetUserAccessOperation.id);
  }

  @InternalHandler(ListMembersByPermissionOperation)
  listMembersByPermission(): never {
    throw new RouteNotImplementedError(ListMembersByPermissionOperation.id);
  }
}
