import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UsageMetric } from '@contracts/billing';
import { ActorGuards } from '@platform/auth';
import { HttpRequestKey, type PipelineRequest } from '@platform/http/nest';
import { QuotaChecker } from '../quota-checker.js';
import { QUOTA_METRIC } from './quota-metadata.js';

/**
 * Rejects with `BILLING.QUOTA.EXCEEDED` the call of a service account whose tenant exhausted the route's
 * metric. People do not consume that quota: what is measured and limited is integration usage.
 */
@Injectable()
export class QuotaGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly quotas: QuotaChecker,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metric = this.reflector.get<UsageMetric | undefined>(
      QUOTA_METRIC,
      context.getHandler(),
    );
    const actor = context.switchToHttp().getRequest<PipelineRequest>()[
      HttpRequestKey.Call
    ]?.actor;
    if (
      metric === undefined ||
      actor === undefined ||
      !ActorGuards.isServiceAccount(actor)
    ) {
      return true;
    }
    await this.quotas.enforce(actor.tenantId, metric);
    return true;
  }
}
