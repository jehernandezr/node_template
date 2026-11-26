import { Injectable } from '@nestjs/common';
import {
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
import { BillingAccounts } from '../application/billing-accounts.js';

/**
 * Opening and closing of the billing account, the billing steps in the tenant signup saga.
 */
@Injectable()
export class AccountsInternalOperations {
  constructor(private readonly accounts: BillingAccounts) {}

  /**
   * Internal operation that opens the billing account of a tenant.
   * @param input Tenant whose account opens.
   * @returns The opened account, or the business error.
   */
  @InternalHandler(OpenAccountOperation)
  async openAccount(
    input: OpenBillingAccountInput,
  ): Promise<HandlerResult<BillingAccountResult>> {
    return {
      outcome: CallOutcome.success(await this.accounts.open(input.tenantId)),
    };
  }

  /**
   * Internal operation that closes the billing account of a tenant, the compensation of opening it.
   * @param input Tenant whose account closes.
   * @returns The closed account, or the business error.
   */
  @InternalHandler(CloseAccountOperation)
  async closeAccount(
    input: CloseBillingAccountInput,
  ): Promise<HandlerResult<BillingAccountClosed>> {
    return {
      outcome: CallOutcome.success(await this.accounts.close(input.tenantId)),
    };
  }
}
