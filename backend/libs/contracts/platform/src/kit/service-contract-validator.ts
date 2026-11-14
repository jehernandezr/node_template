import { Compensation } from '../enums/compensation.enum.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import type { ServiceContract } from './define-service-contract.js';

const SERVICE = /^[a-z][a-z0-9-]*$/;
const TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_NAME = /^[a-z][A-Za-z0-9]*$/;

enum PlacementKind {
  Event = 'evento',
  Command = 'comando',
}

/**
 * Comprueba la coherencia local de un contrato: nombres, identificadores únicos
 * y del propio servicio, un catálogo completo por cada enum de errores, la
 * reversa de cada operación y la ubicación de cada evento y comando en un
 * tópico o una cola del servicio. Lanza `ContractDefinitionError` al primer
 * incumplimiento.
 */
export class ServiceContractValidator {
  validate(contract: ServiceContract): void {
    if (!SERVICE.test(contract.service)) {
      throw new ContractDefinitionError(
        `Servicio inválido: ${contract.service}`,
      );
    }
    this.checkMemberNames(contract);
    this.checkIdentifiers(contract);
    this.checkDeprecations(contract);
    this.checkCompensations(contract);
    this.checkMessaging(contract);
    this.checkErrorCatalogs(contract);
  }

  /** Prefijo de los códigos de error de un servicio: `IDENTITY.` para `identity`. */
  errorCodePrefixOf(service: string): string {
    return `${service.toUpperCase().replace(/-/g, '_')}.`;
  }

  /** Los tipos exportados van en PascalCase y los miembros en camelCase. */
  private checkMemberNames(contract: ServiceContract): void {
    const { service } = contract;
    const groups: readonly [string, object, RegExp][] = [
      ['enum', contract.enums, TYPE_NAME],
      ['constante', contract.constants, TYPE_NAME],
      ['esquema', contract.schemas, TYPE_NAME],
      ['ruta', contract.routes, MEMBER_NAME],
      ['operación', contract.operations, MEMBER_NAME],
      ['evento', contract.events, MEMBER_NAME],
      ['comando', contract.commands, MEMBER_NAME],
      ['tópico', contract.topics, MEMBER_NAME],
      ['cola', contract.queues, MEMBER_NAME],
    ];
    for (const [kind, members, pattern] of groups) {
      this.checkNames(service, kind, Object.keys(members), pattern);
    }
  }

  /**
   * Los ids que viajan entre servicios son únicos dentro del contrato y llevan
   * el prefijo del servicio, para que el export global no los confunda.
   */
  private checkIdentifiers(contract: ServiceContract): void {
    const { service } = contract;
    const routes = Object.values(contract.routes);
    const routeIds = routes.map((r) => r.id);
    const operationIds = Object.values(contract.operations).map((o) => o.id);
    const eventTypes = Object.values(contract.events).map((e) => e.type);
    const commandTypes = Object.values(contract.commands).map((c) => c.type);
    this.checkUnique(service, 'id de ruta', routeIds);
    this.checkUnique(
      service,
      'método y path',
      routes.map((r) => `${r.method} ${r.path}`),
    );
    this.checkUnique(service, 'id de operación', operationIds);
    this.checkUnique(service, 'tipo de mensaje', [
      ...eventTypes,
      ...commandTypes,
    ]);

    const idPrefix = `${service}.`;
    this.checkPrefix(service, 'la ruta', routeIds, idPrefix);
    this.checkPrefix(service, 'la operación', operationIds, idPrefix);
    this.checkPrefix(service, 'el evento', eventTypes, idPrefix);
    this.checkPrefix(service, 'el comando', commandTypes, idPrefix);
    this.checkPrefix(
      service,
      'el tópico o la cola',
      [
        ...Object.values(contract.topics),
        ...Object.values(contract.queues),
      ].map((x) => x.name),
      `${service}-`,
    );
  }

  /** Una ruta obsoleta solo puede apuntar a otra ruta del mismo contrato. */
  private checkDeprecations(contract: ServiceContract): void {
    const routes = Object.values(contract.routes);
    const routeIds = new Set(routes.map((r) => r.id));
    for (const route of routes) {
      const replacement = route.deprecated?.replacement;
      if (replacement !== undefined && !routeIds.has(replacement)) {
        this.fail(
          contract.service,
          `la ruta ${route.id} se reemplaza con ${replacement}, que no está en el contrato`,
        );
      }
    }
  }

  /** Cada catálogo cubre exactamente su enum y usa el prefijo del servicio. */
  private checkErrorCatalogs(contract: ServiceContract): void {
    const { service } = contract;
    const codePrefix = this.errorCodePrefixOf(service);
    for (const [enumName, entries] of Object.entries(contract.errors)) {
      const values = contract.enums[enumName];
      if (!values) {
        this.fail(service, `el catálogo ${enumName} no tiene enum en enums`);
      }
      const codes = entries.map((e) => e.code).sort();
      const expected = Object.values(values).sort();
      if (codes.join() !== expected.join()) {
        this.fail(service, `el catálogo ${enumName} no coincide con su enum`);
      }
      this.checkPrefix(service, 'el código de error', codes, codePrefix);
    }
  }

  private checkNames(
    service: string,
    kind: string,
    names: readonly string[],
    pattern: RegExp,
  ): void {
    for (const name of names) {
      if (!pattern.test(name)) {
        throw new ContractDefinitionError(
          `Contrato ${service}: nombre de ${kind} inválido ${name}`,
        );
      }
    }
  }

  private checkUnique(service: string, kind: string, ids: string[]): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new ContractDefinitionError(
          `Contrato ${service}: ${kind} repetido ${id}`,
        );
      }
      seen.add(id);
    }
  }

  private checkPrefix(
    service: string,
    kind: string,
    ids: readonly string[],
    prefix: string,
  ): void {
    for (const id of ids) {
      if (!id.startsWith(prefix)) {
        throw new ContractDefinitionError(
          `Contrato ${service}: ${kind} ${id} no pertenece al servicio (se espera el prefijo ${prefix})`,
        );
      }
    }
  }

  private fail(service: string, reason: string): never {
    throw new ContractDefinitionError(`Contrato ${service}: ${reason}`);
  }

  /**
   * Comprueba la reversa de cada operación: `compensatedBy` es `Compensation.None`
   * o el id de otra operación del mismo contrato que modifica datos y es
   * idempotente, porque una saga puede repetirla.
   */
  private checkCompensations(contract: ServiceContract): void {
    const byId = new Map(
      Object.values(contract.operations).map((op) => [op.id, op]),
    );
    for (const op of byId.values()) {
      const target = op.compensatedBy;
      if (target === undefined || target === Compensation.None) continue;
      const reverse = byId.get(target);
      if (!reverse) {
        this.fail(
          contract.service,
          `la operación ${op.id} se compensa con ${target}, que no está en el contrato`,
        );
      }
      if (!reverse.mutating) {
        this.fail(
          contract.service,
          `la reversa ${target} de ${op.id} es de solo lectura`,
        );
      }
      if (!reverse.idempotent) {
        this.fail(
          contract.service,
          `la reversa ${target} de ${op.id} no es idempotente`,
        );
      }
    }
  }

  /** Cada mensaje propio va en exactamente un tópico o una cola propia. */
  private checkPlacement<M extends { readonly type: string }>(
    service: string,
    kind: PlacementKind,
    owned: readonly M[],
    containers: readonly {
      readonly name: string;
      readonly items: readonly M[];
    }[],
  ): void {
    const ownedTypes = new Map(owned.map((m) => [m.type, m]));
    const placed = new Map<string, string>();
    for (const container of containers) {
      for (const item of container.items) {
        if (ownedTypes.get(item.type) !== item) {
          this.fail(
            service,
            `${container.name} lleva ${item.type}, que no es un ${kind} del contrato`,
          );
        }
        const previous = placed.get(item.type);
        if (previous !== undefined) {
          this.fail(
            service,
            `${item.type} está en ${previous} y en ${container.name}`,
          );
        }
        placed.set(item.type, container.name);
      }
    }
    for (const type of ownedTypes.keys()) {
      if (!placed.has(type)) {
        this.fail(
          service,
          `el ${kind} ${type} no tiene ${kind === PlacementKind.Event ? 'tópico' : 'cola'}`,
        );
      }
    }
  }

  private checkMessaging(contract: ServiceContract): void {
    const { service } = contract;
    const topics = Object.values(contract.topics);
    const queues = Object.values(contract.queues);
    this.checkPlacement(
      service,
      PlacementKind.Event,
      Object.values(contract.events),
      topics.map((t) => ({ name: `el tópico ${t.name}`, items: t.events })),
    );
    this.checkPlacement(
      service,
      PlacementKind.Command,
      Object.values(contract.commands),
      queues.map((q) => ({ name: `la cola ${q.name}`, items: q.commands })),
    );
    this.checkUnique(
      service,
      'nombre de tópico o cola',
      [...topics, ...queues].map((x) => x.name),
    );
    this.checkUnique(
      service,
      'comando enviado',
      contract.sends.map((c) => c.type),
    );
  }
}
