import type { InstanceEndpoints } from '../../model/instance-endpoints.js';
import { InstanceEndpointResolver } from '../../ports/instance-endpoint-resolver.js';

/** Resuelve cualquier instancia a un primario con su mismo nombre como host, sin réplicas. Registra cada consulta. */
export class FakeInstanceEndpointResolver extends InstanceEndpointResolver {
  readonly resolved: string[] = [];

  resolve(instance: string): InstanceEndpoints {
    this.resolved.push(instance);
    return { primary: { host: instance, port: 5432 }, replicas: [] };
  }
}
