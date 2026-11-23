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

/** Lecturas de entitlements y cuotas que piden identity y los servicios que aplican cuotas. */
@Injectable()
export class EntitlementsInternalOperations {
  constructor(private readonly queries: EntitlementQueries) {}

  @InternalHandler(GetEntitlementsOperation)
  async getEntitlements(
    input: GetEntitlementsInput,
  ): Promise<HandlerResult<Entitlements>> {
    return {
      outcome: CallOutcome.success(await this.queries.snapshot(input.tenantId)),
    };
  }

  @InternalHandler(CheckQuotaOperation)
  async checkQuota(input: CheckQuotaInput): Promise<HandlerResult<QuotaCheck>> {
    return {
      outcome: CallOutcome.success(
        await this.queries.check(input.tenantId, input.metric, input.requested),
      ),
    };
  }
}
