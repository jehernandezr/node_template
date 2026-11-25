import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthState, type HealthReport } from '@platform/kernel';
import { HealthRegistry, type HealthSummary } from '@platform/observability';
import { HealthRoute } from './health-route.enum.js';

/**
 * Health endpoints on top of `HealthRegistry`. They stay out of the service HTTP contract: they are
 * consumed by the load balancer and the platform, not by the API clients.
 */
@Controller(HealthRoute.Base)
export class HealthEndpoints {
  constructor(private readonly registry: HealthRegistry) {}

  /** Responds while the process is alive; does not query dependencies. */
  @Get(HealthRoute.Live)
  live(): HealthReport {
    return { state: HealthState.Up };
  }

  /** `Down` responds 503 with the summary as the body, so the load balancer stops sending traffic. */
  @Get(HealthRoute.Ready)
  async ready(): Promise<HealthSummary> {
    const summary = await this.registry.checkAll();
    if (summary.state === HealthState.Down) {
      throw new ServiceUnavailableException(summary);
    }
    return summary;
  }
}
