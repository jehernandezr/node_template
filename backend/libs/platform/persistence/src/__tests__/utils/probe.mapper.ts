import type { EntityMapper } from '../../model/entity-mapper.js';
import { ProbeEntity } from './probe.entity.js';
import { Probe } from './probe.js';

/** Mapper de ejemplo: una `Probe` sin versión (0) se inserta; con versión, se actualiza. */
export class ProbeMapper implements EntityMapper<Probe, ProbeEntity> {
  toDomain(entity: ProbeEntity): Probe {
    return new Probe(
      entity.id,
      entity.name,
      entity.priority,
      entity.version ?? 0,
      entity.tenantId,
    );
  }

  toPersistence(aggregate: Probe): ProbeEntity {
    const entity = new ProbeEntity();
    entity.id = aggregate.id;
    entity.name = aggregate.name;
    entity.priority = aggregate.priority;
    if (aggregate.version > 0) {
      entity.version = aggregate.version;
    }
    return entity;
  }
}
