import { TenantIsolatedRepository } from '../../tenant-isolated-repository.js';
import type { RepositoryKit } from '../../repository-kit.js';
import { ProbeEntity } from './probe.entity.js';
import type { ProbeMapper } from './probe.mapper.js';
import type { Probe } from './probe.js';

/** Sample repository: the minimum a service writes on top of `TenantIsolatedRepository`. */
export class ProbeRepository extends TenantIsolatedRepository {
  constructor(
    kit: RepositoryKit,
    protected readonly mapper: ProbeMapper,
  ) {
    super(kit);
  }

  /** The probe of the scope tenant, or `null` if it does not exist or was soft deleted. */
  async findById(id: string): Promise<Probe | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(ProbeEntity, { id, tenantId }),
    );
    return entity === null ? null : this.mapper.toDomain(entity);
  }

  /** The probe of the scope tenant with that name, or `null`. */
  async findByName(name: string): Promise<Probe | null> {
    const tenantId = this.tenantId();
    const entity = await this.read((manager) =>
      manager.findOneBy(ProbeEntity, { name, tenantId }),
    );
    return entity === null ? null : this.mapper.toDomain(entity);
  }

  /**
   * Inserts a probe without a version and updates one with a version, then reads it back from the primary.
   * @throws OptimisticLockError if the version is no longer the stored one.
   */
  async save(probe: Probe): Promise<Probe> {
    const entity = this.mapper.toPersistence(probe);
    if (entity.version === undefined) {
      await this.insertOwned(ProbeEntity, entity);
    } else {
      await this.updateOwned(ProbeEntity, entity);
    }
    const tenantId = this.tenantId();
    const saved = await this.readPrimary((manager) =>
      manager.findOneByOrFail(ProbeEntity, { id: entity.id, tenantId }),
    );
    return this.mapper.toDomain(saved);
  }

  /** Soft deletes the probe of the scope tenant. Does nothing if it does not exist. */
  async remove(id: string): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.softDelete(ProbeEntity, { id, tenantId }),
    );
  }
}
