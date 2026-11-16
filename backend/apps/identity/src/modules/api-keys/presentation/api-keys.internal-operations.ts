import { InternalHandler } from '@platform/internal-api/nest';
import { AuthenticateApiKeyOperation } from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

/** Operaciones internas de api-keys. El arranque exige un handler por cada operación del contrato, así que responden como no implementadas hasta tener su caso de uso. */
export class ApiKeysInternalOperations {
  @InternalHandler(AuthenticateApiKeyOperation)
  authenticateApiKey(): never {
    throw new RouteNotImplementedError(AuthenticateApiKeyOperation.id);
  }
}
