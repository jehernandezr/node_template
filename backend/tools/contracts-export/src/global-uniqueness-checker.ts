import type { ServiceContract } from '@contracts/platform';
import { ExportError } from './export-error.js';

/**
 * Comprueba que los identificadores que viajan entre servicios no se repitan
 * entre contratos: ids de ruta y de operación, tipos de mensaje y nombres de
 * tópicos y colas. Dentro de cada contrato ya lo valida `defineServiceContract`.
 */
export class GlobalUniquenessChecker {
  check(contracts: readonly ServiceContract[]): void {
    const seen = new Map<string, string>();
    const claim = (kind: string, id: string, service: string) => {
      const key = `${kind}:${id}`;
      const previous = seen.get(key);
      if (previous !== undefined && previous !== service) {
        throw ExportError.forService(
          service,
          `${kind} ${id} ya está declarado en ${previous}`,
        );
      }
      seen.set(key, service);
    };
    for (const contract of contracts) {
      const { service } = contract;
      for (const route of Object.values(contract.routes)) {
        claim('la ruta', route.id, service);
      }
      for (const op of Object.values(contract.operations)) {
        claim('la operación', op.id, service);
      }
      for (const message of [
        ...Object.values(contract.events),
        ...Object.values(contract.commands),
      ]) {
        claim('el mensaje', message.type, service);
      }
      for (const target of [
        ...Object.values(contract.topics),
        ...Object.values(contract.queues),
      ]) {
        claim('el tópico o la cola', target.name, service);
      }
    }
  }
}
