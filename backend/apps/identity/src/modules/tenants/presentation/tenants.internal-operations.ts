import { InternalHandler } from '@platform/internal-api/nest';
import {
  CreateTenantOperation,
  DiscardTenantOperation,
  SuspendTenantOperation,
  ReactivateTenantOperation,
  ActivateTenantOperation,
  identityContract,
} from '@contracts/identity';
import { RouteNotImplementedError } from '../../../shared/errors/route-not-implemented.error.js';

/** Operaciones internas de tenants. El arranque exige un handler por cada operación del contrato, así que responden como no implementadas hasta tener su caso de uso. */
export class TenantsInternalOperations {
  @InternalHandler(CreateTenantOperation)
  createTenant(): never {
    throw new RouteNotImplementedError(CreateTenantOperation.id);
  }

  @InternalHandler(DiscardTenantOperation)
  discardTenant(): never {
    throw new RouteNotImplementedError(DiscardTenantOperation.id);
  }

  @InternalHandler(SuspendTenantOperation)
  suspendTenant(): never {
    throw new RouteNotImplementedError(SuspendTenantOperation.id);
  }

  @InternalHandler(ReactivateTenantOperation)
  reactivateTenant(): never {
    throw new RouteNotImplementedError(ReactivateTenantOperation.id);
  }

  @InternalHandler(ActivateTenantOperation)
  activateTenant(): never {
    throw new RouteNotImplementedError(ActivateTenantOperation.id);
  }

  @InternalHandler(identityContract.operations.tenantMoveSync)
  tenantMoveSync(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveSync.id,
    );
  }

  @InternalHandler(identityContract.operations.tenantMoveFinalize)
  tenantMoveFinalize(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveFinalize.id,
    );
  }

  @InternalHandler(identityContract.operations.tenantMoveAbort)
  tenantMoveAbort(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveAbort.id,
    );
  }

  @InternalHandler(identityContract.operations.tenantMoveCleanup)
  tenantMoveCleanup(): never {
    throw new RouteNotImplementedError(
      identityContract.operations.tenantMoveCleanup.id,
    );
  }
}
