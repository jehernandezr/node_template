import type { InstanceEndpoints } from '../../model/instance-endpoints.js';
import { InstanceEndpointResolver } from '../../ports/instance-endpoint-resolver.js';

/** Resolves any instance to a primary with its same name as host, without replicas. Records each query. */
export class FakeInstanceEndpointResolver extends InstanceEndpointResolver {
  readonly resolved: string[] = [];

  override resolve(instance: string): InstanceEndpoints {
    this.resolved.push(instance);
    return { primary: { host: instance, port: 5432 }, replicas: [] };
  }
}
