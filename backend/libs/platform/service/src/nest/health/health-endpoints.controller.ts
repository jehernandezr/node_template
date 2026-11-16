import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { HealthState, type HealthReport } from '@platform/kernel';
import { HealthRegistry, type HealthSummary } from '@platform/observability';
import { HealthRoute } from './health-route.enum.js';

/**
 * Endpoints de salud sobre `HealthRegistry`. Quedan fuera del contrato HTTP del servicio: los
 * consumen el balanceador y la plataforma, no los clientes de la API.
 */
@Controller(HealthRoute.Base)
export class HealthEndpoints {
  constructor(private readonly registry: HealthRegistry) {}

  /** Responde mientras el proceso vive; no consulta dependencias. */
  @Get(HealthRoute.Live)
  live(): HealthReport {
    return { state: HealthState.Up };
  }

  /** `Down` responde 503 con el resumen como cuerpo, para que el balanceador deje de enviar tráfico. */
  @Get(HealthRoute.Ready)
  async ready(): Promise<HealthSummary> {
    const summary = await this.registry.checkAll();
    if (summary.state === HealthState.Down) {
      throw new ServiceUnavailableException(summary);
    }
    return summary;
  }
}
