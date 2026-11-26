import type { ServiceContract } from '@contracts/platform';
import { ExportError } from './export-error.js';

/**
 * Checks that identifiers that travel between services are not repeated
 * across contracts: route and operation ids, message types and topic and
 * queue names. Within each contract `defineServiceContract` already validates it.
 */
export class GlobalUniquenessChecker {
  /**
   * Checks that error codes, operation names and event types are unique across services.
   * @param contracts Contracts of every service.
   */
  check(contracts: readonly ServiceContract[]): void {
    const seen = new Map<string, string>();
    const claim = (kind: string, id: string, service: string) => {
      const key = `${kind}:${id}`;
      const previous = seen.get(key);
      if (previous !== undefined && previous !== service) {
        throw ExportError.forService(
          service,
          `${kind} ${id} is already declared in ${previous}`,
        );
      }
      seen.set(key, service);
    };
    for (const contract of contracts) {
      const { service } = contract;
      for (const route of Object.values(contract.routes)) {
        claim('route', route.id, service);
      }
      for (const op of Object.values(contract.operations)) {
        claim('operation', op.id, service);
      }
      for (const message of [
        ...Object.values(contract.events),
        ...Object.values(contract.commands),
      ]) {
        claim('message', message.type, service);
      }
      for (const target of [
        ...Object.values(contract.topics),
        ...Object.values(contract.queues),
      ]) {
        claim('topic or queue', target.name, service);
      }
    }
  }
}
