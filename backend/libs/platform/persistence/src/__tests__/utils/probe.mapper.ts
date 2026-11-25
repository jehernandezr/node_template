import type { EntityMapper } from '../../model/entity-mapper.js';
import { ProbeEntity } from './probe.entity.js';
import { Probe } from './probe.js';

/** Sample mapper: a `Probe` without a version (0) is inserted; with a version, it is updated. */
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
