import { Compensation } from '../enums/compensation.enum.js';
import { ContractDefinitionError } from './contract-definition-error.js';
import type { ServiceContract } from './define-service-contract.js';

const SERVICE = /^[a-z][a-z0-9-]*$/;
const TYPE_NAME = /^[A-Z][A-Za-z0-9]*$/;
const MEMBER_NAME = /^[a-z][A-Za-z0-9]*$/;

enum PlacementKind {
  Event = 'event',
  Command = 'command',
}

/**
 * Checks the local consistency of a contract: names, identifiers that are unique
 * and belong to the service itself, a complete catalog for each error enum, the
 * reverse of each operation and the placement of each event and command on a
 * topic or queue of the service. Throws `ContractDefinitionError` at the first
 * violation.
 */
export class ServiceContractValidator {
  /**
   * Checks the contract's routes, operations and error codes before it is used.
   * @param contract Service contract.
   */
  validate(contract: ServiceContract): void {
    if (!SERVICE.test(contract.service)) {
      throw new ContractDefinitionError(`Invalid service: ${contract.service}`);
    }
    this.checkMemberNames(contract);
    this.checkIdentifiers(contract);
    this.checkDeprecations(contract);
    this.checkCompensations(contract);
    this.checkMessaging(contract);
    this.checkErrorCatalogs(contract);
  }

  /**
   * Prefix of a service's error codes: `IDENTITY.` for `identity`.
   * @param service Service name.
   * @returns The prefix.
   */
  errorCodePrefixOf(service: string): string {
    return `${service.toUpperCase().replace(/-/g, '_')}.`;
  }

  /** Exported types go in PascalCase and members in camelCase. */
  private checkMemberNames(contract: ServiceContract): void {
    const { service } = contract;
    const groups: readonly [string, object, RegExp][] = [
      ['enum', contract.enums, TYPE_NAME],
      ['constant', contract.constants, TYPE_NAME],
      ['schema', contract.schemas, TYPE_NAME],
      ['route', contract.routes, MEMBER_NAME],
      ['operation', contract.operations, MEMBER_NAME],
      ['event', contract.events, MEMBER_NAME],
      ['command', contract.commands, MEMBER_NAME],
      ['topic', contract.topics, MEMBER_NAME],
      ['queue', contract.queues, MEMBER_NAME],
    ];
    for (const [kind, members, pattern] of groups) {
      this.checkNames(service, kind, Object.keys(members), pattern);
    }
  }

  /**
   * The ids that travel between services are unique within the contract and carry
   * the service prefix, so the global export does not mix them up.
   */
  private checkIdentifiers(contract: ServiceContract): void {
    const { service } = contract;
    const routes = Object.values(contract.routes);
    const routeIds = routes.map((r) => r.id);
    const operationIds = Object.values(contract.operations).map((o) => o.id);
    const eventTypes = Object.values(contract.events).map((e) => e.type);
    const commandTypes = Object.values(contract.commands).map((c) => c.type);
    this.checkUnique(service, 'route id', routeIds);
    this.checkUnique(
      service,
      'method and path',
      routes.map((r) => `${r.method} ${r.path}`),
    );
    this.checkUnique(service, 'operation id', operationIds);
    this.checkUnique(service, 'message type', [...eventTypes, ...commandTypes]);

    const idPrefix = `${service}.`;
    this.checkPrefix(service, 'route', routeIds, idPrefix);
    this.checkPrefix(service, 'operation', operationIds, idPrefix);
    this.checkPrefix(service, 'event', eventTypes, idPrefix);
    this.checkPrefix(service, 'command', commandTypes, idPrefix);
    this.checkPrefix(
      service,
      'topic or queue',
      [
        ...Object.values(contract.topics),
        ...Object.values(contract.queues),
      ].map((x) => x.name),
      `${service}-`,
    );
  }

  /** A deprecated route can only point to another route of the same contract. */
  private checkDeprecations(contract: ServiceContract): void {
    const routes = Object.values(contract.routes);
    const routeIds = new Set(routes.map((r) => r.id));
    for (const route of routes) {
      const replacement = route.deprecated?.replacement;
      if (replacement !== undefined && !routeIds.has(replacement)) {
        this.fail(
          contract.service,
          `route ${route.id} is replaced by ${replacement}, which is not in the contract`,
        );
      }
    }
  }

  /** Each catalog covers exactly its enum and uses the service prefix. */
  private checkErrorCatalogs(contract: ServiceContract): void {
    const { service } = contract;
    const codePrefix = this.errorCodePrefixOf(service);
    for (const [enumName, entries] of Object.entries(contract.errors)) {
      const values = contract.enums[enumName];
      if (!values) {
        this.fail(service, `catalog ${enumName} has no enum in enums`);
      }
      const codes = entries.map((e) => e.code).sort();
      const expected = Object.values(values).sort();
      if (codes.join() !== expected.join()) {
        this.fail(service, `catalog ${enumName} does not match its enum`);
      }
      this.checkPrefix(service, 'error code', codes, codePrefix);
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
          `Contract ${service}: invalid ${kind} name ${name}`,
        );
      }
    }
  }

  private checkUnique(service: string, kind: string, ids: string[]): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        throw new ContractDefinitionError(
          `Contract ${service}: duplicate ${kind} ${id}`,
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
          `Contract ${service}: ${kind} ${id} does not belong to the service (expected prefix ${prefix})`,
        );
      }
    }
  }

  private fail(service: string, reason: string): never {
    throw new ContractDefinitionError(`Contract ${service}: ${reason}`);
  }

  /**
   * Checks the reverse of each operation: `compensatedBy` is `Compensation.None`
   * or the id of another operation of the same contract that modifies data and is
   * idempotent, because a saga may repeat it.
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
          `operation ${op.id} is compensated by ${target}, which is not in the contract`,
        );
      }
      if (!reverse.mutating) {
        this.fail(
          contract.service,
          `reverse ${target} of ${op.id} is read-only`,
        );
      }
      if (!reverse.idempotent) {
        this.fail(
          contract.service,
          `reverse ${target} of ${op.id} is not idempotent`,
        );
      }
    }
  }

  /** Each owned message goes on exactly one owned topic or queue. */
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
            `${container.name} carries ${item.type}, which is not a contract ${kind}`,
          );
        }
        const previous = placed.get(item.type);
        if (previous !== undefined) {
          this.fail(
            service,
            `${item.type} is in ${previous} and in ${container.name}`,
          );
        }
        placed.set(item.type, container.name);
      }
    }
    for (const type of ownedTypes.keys()) {
      if (!placed.has(type)) {
        this.fail(
          service,
          `${kind} ${type} has no ${kind === PlacementKind.Event ? 'topic' : 'queue'}`,
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
      topics.map((t) => ({ name: `topic ${t.name}`, items: t.events })),
    );
    this.checkPlacement(
      service,
      PlacementKind.Command,
      Object.values(contract.commands),
      queues.map((q) => ({ name: `queue ${q.name}`, items: q.commands })),
    );
    this.checkUnique(
      service,
      'topic or queue name',
      [...topics, ...queues].map((x) => x.name),
    );
    this.checkUnique(
      service,
      'sent command',
      contract.sends.map((c) => c.type),
    );
  }
}
