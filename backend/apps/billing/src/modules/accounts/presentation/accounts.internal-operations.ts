import { Injectable } from '@nestjs/common';
import {
  billingContract,
  CloseAccountOperation,
  OpenAccountOperation,
  type BillingAccountClosed,
  type BillingAccountResult,
  type CloseBillingAccountInput,
  type OpenBillingAccountInput,
} from '@contracts/billing';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { OperationNotImplementedError } from '../../../shared/errors/operation-not-implemented.error.js';
import { BillingAccounts } from '../application/billing-accounts.js';

/**
 * Apertura y cierre de la cuenta de facturación, los pasos de billing en la saga de alta de tenant. Las
 * operaciones de traslado llegan con `MoveTenant`.
 */
@Injectable()
export class AccountsInternalOperations {
  constructor(private readonly accounts: BillingAccounts) {}

  @InternalHandler(OpenAccountOperation)
  async openAccount(
    input: OpenBillingAccountInput,
  ): Promise<HandlerResult<BillingAccountResult>> {
    return {
      outcome: CallOutcome.success(await this.accounts.open(input.tenantId)),
    };
  }

  @InternalHandler(CloseAccountOperation)
  async closeAccount(
    input: CloseBillingAccountInput,
  ): Promise<HandlerResult<BillingAccountClosed>> {
    return {
      outcome: CallOutcome.success(await this.accounts.close(input.tenantId)),
    };
  }

  @InternalHandler(billingContract.operations.tenantMoveSync)
  tenantMoveSync(): never {
    throw new OperationNotImplementedError(
      billingContract.operations.tenantMoveSync.id,
    );
  }

  @InternalHandler(billingContract.operations.tenantMoveFinalize)
  tenantMoveFinalize(): never {
    throw new OperationNotImplementedError(
      billingContract.operations.tenantMoveFinalize.id,
    );
  }

  @InternalHandler(billingContract.operations.tenantMoveAbort)
  tenantMoveAbort(): never {
    throw new OperationNotImplementedError(
      billingContract.operations.tenantMoveAbort.id,
    );
  }

  @InternalHandler(billingContract.operations.tenantMoveCleanup)
  tenantMoveCleanup(): never {
    throw new OperationNotImplementedError(
      billingContract.operations.tenantMoveCleanup.id,
    );
  }
}
