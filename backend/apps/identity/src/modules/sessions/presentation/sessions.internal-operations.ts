import { InternalHandler } from '@platform/internal-api/nest';
import { RevokeUserSessionsOperation } from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

/** Operaciones internas de sessions. El arranque exige un handler por cada operación del contrato, así que responden como no implementadas hasta tener su caso de uso. */
export class SessionsInternalOperations {
  @InternalHandler(RevokeUserSessionsOperation)
  revokeUserSessions(): never {
    throw new RouteNotImplementedError(RevokeUserSessionsOperation.id);
  }
}
