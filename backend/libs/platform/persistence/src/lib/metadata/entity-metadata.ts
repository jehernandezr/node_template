import { PartitionBy, PartitionInterval } from '../enums.js';
import { invalidConfiguration } from '../errors.js';

/** Clase de una entidad ORM. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type EntityClass = abstract new (...args: any[]) => object;

/** Dónde vive una entidad. */
export enum EntityPlacement {
  /** En cada shard, enrutada por su llave. */
  Sharded = 'sharded',
  /** En el catálogo global. */
  Global = 'global',
}

/** Opciones de {@link Audited}. */
export interface AuditedOptions {
  /** Columnas que nunca se copian a `audit_log`, por ejemplo `password_hash`. */
  readonly exclude?: readonly string[];
}

/** Opciones de {@link Partitioned}. */
export interface PartitionedOptions {
  readonly by: PartitionBy;
  /** Columna de partición. Para `Range` sobre UUIDv7 es el propio `id`. */
  readonly column: string;
  /** Intervalo de cada partición por rango. Por defecto un mes. */
  readonly interval?: PartitionInterval;
  /** Particiones vencidas que se archivan, en meses o días según el intervalo. */
  readonly retention?: number;
}

/** Lo que las declaraciones de la capa dicen de una entidad. */
export interface PersistenceEntityMetadata {
  readonly placement?: EntityPlacement;
  readonly shardKeyField?: string;
  readonly audited?: AuditedOptions;
  readonly partitioned?: PartitionedOptions;
}

const registry = new WeakMap<object, PersistenceEntityMetadata>();

function merge(target: object, patch: PersistenceEntityMetadata): void {
  const current = registry.get(target) ?? {};
  if (
    patch.placement !== undefined &&
    current.placement !== undefined &&
    current.placement !== patch.placement
  ) {
    throw invalidConfiguration('entity placement', 'either sharded or global');
  }
  registry.set(target, { ...current, ...patch });
}

/** La entidad vive en cada shard y se enruta por su llave. */
export function ShardedEntity(): ClassDecorator {
  return (target) => merge(target, { placement: EntityPlacement.Sharded });
}

/** La entidad vive en el catálogo global. */
export function GlobalEntity(): ClassDecorator {
  return (target) => merge(target, { placement: EntityPlacement.Global });
}

/** Marca el campo que lleva la llave de shard (tenant, usuario o propia). */
export function ShardKeyColumn(): PropertyDecorator {
  return (target, propertyKey) => {
    if (typeof propertyKey !== 'string') {
      throw invalidConfiguration('ShardKeyColumn', 'a string property');
    }
    merge(target.constructor, { shardKeyField: propertyKey });
  };
}

/**
 * La tabla de la entidad lleva el trigger de auditoría. La migración lo crea
 * con `auditTriggerSql(tabla, auditOptionsOf(Entidad))`.
 */
export function Audited(options: AuditedOptions = {}): ClassDecorator {
  return (target) =>
    merge(target, { audited: { exclude: [...(options.exclude ?? [])] } });
}

/**
 * La tabla está particionada. La migración la crea con
 * `createPartitionedTableSql` y un job llama a `platform_ensure_partitions`.
 */
export function Partitioned(options: PartitionedOptions): ClassDecorator {
  if (!Object.values(PartitionBy).includes(options.by)) {
    throw invalidConfiguration('Partitioned.by', 'a PartitionBy');
  }
  return (target) =>
    merge(target, {
      partitioned: {
        ...options,
        interval: options.interval ?? PartitionInterval.Month,
      },
    });
}

/** Declaraciones de la capa sobre una entidad, o un objeto vacío. */
export function persistenceMetadataOf(
  entity: EntityClass,
): PersistenceEntityMetadata {
  return registry.get(entity) ?? {};
}
