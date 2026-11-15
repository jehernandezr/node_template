import { ShardedRepository } from '../../sharded-repository.js';
import type { RepositoryKit } from '../../repository-kit.js';
import { ProbeEntity } from './probe.entity.js';
import type { ProbeMapper } from './probe.mapper.js';
import type { Probe } from './probe.js';

/** Repositorio de ejemplo: lo mínimo que escribe un servicio sobre `ShardedRepository`. */
export class ProbeRepository extends ShardedRepository<Probe, ProbeEntity> {
  constructor(kit: RepositoryKit, mapper: ProbeMapper) {
    super(ProbeEntity, kit, mapper);
  }

  async findByName(name: string): Promise<Probe | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(ProbeEntity, { name, tenantId }),
    );
    return entity === null ? null : this.mapper.toDomain(entity);
  }
}
