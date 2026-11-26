import { Injectable } from '@nestjs/common';
import {
  CheckQuotaOperation,
  GetEntitlementsOperation,
  type CheckQuotaInput,
  type Entitlements,
  type GetEntitlementsInput,
  type QuotaCheck,
} from '@contracts/billing';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { EntitlementQueries } from '../application/entitlement-queries.js';

/** Entitlement and quota reads requested by identity and the services that enforce quotas. */
@Injectable()
export class EntitlementsInternalOperations {
  constructor(private readonly queries: EntitlementQueries) {}

  /**
   * Internal operation that returns the entitlements of a tenant.
   * @param input Tenant to read.
   * @returns The entitlements, or the business error.
   */
  @InternalHandler(GetEntitlementsOperation)
  async getEntitlements(
    input: GetEntitlementsInput,
  ): Promise<HandlerResult<Entitlements>> {
    return {
      outcome: CallOutcome.success(await this.queries.snapshot(input.tenantId)),
    };
  }

  /**
   * Internal operation that checks a quota before consuming it.
   * @param input Tenant, metric and requested units.
   * @returns The quota check, or the business error.
   */
  @InternalHandler(CheckQuotaOperation)
  async checkQuota(input: CheckQuotaInput): Promise<HandlerResult<QuotaCheck>> {
    return {
      outcome: CallOutcome.success(
        await this.queries.check(input.tenantId, input.metric, input.requested),
      ),
    };
  }
}
