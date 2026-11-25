import { DirectoryWriteResult } from '../../model/directory-write-result.enum.js';
import type { DirectoryStore } from '../../ports/directory-store.js';
import type { DirectoryWriter } from '../../ports/directory-writer.js';
import { PlacementBuilder } from './placement-builder.js';
import { TestTenants } from './test-tenants.js';

/** What the contract test needs from a directory: its two ports and how to seed an instance. */
export interface DirectoryContractSubject {
  readonly store: DirectoryStore;
  readonly writer: DirectoryWriter;
  /** Registers the physical instance of a logical shard; the ports have no instance write. */
  seedInstance(logicalShard: string, instance: string): Promise<void>;
}

/**
 * Contract test of `DirectoryStore` and `DirectoryWriter`: both the in-memory double
 * and the real adapter run it, so they do not diverge.
 * @param factory Creates an empty, isolated directory for each test.
 */
export function runDirectoryStoreContract(
  name: string,
  factory: () => Promise<DirectoryContractSubject>,
): void {
  describe(name, () => {
    it('returns undefined for an unknown tenant', async () => {
      const { store } = await factory();
      await expect(
        store.getPlacement(TestTenants.One),
      ).resolves.toBeUndefined();
    });

    it('returns undefined for an unknown logical shard', async () => {
      const { store } = await factory();
      await expect(store.getInstance('shard-1')).resolves.toBeUndefined();
    });

    it('writes a new placement and reads it back', async () => {
      const { store, writer } = await factory();
      const placement = PlacementBuilder.aPlacement().build();
      await expect(writer.putPlacement(placement, undefined)).resolves.toBe(
        DirectoryWriteResult.Written,
      );
      await expect(store.getPlacement(TestTenants.One)).resolves.toEqual(
        placement,
      );
    });

    it('reports a conflict when creating a tenant that already exists', async () => {
      const { writer } = await factory();
      const placement = PlacementBuilder.aPlacement().build();
      await writer.putPlacement(placement, undefined);
      await expect(writer.putPlacement(placement, undefined)).resolves.toBe(
        DirectoryWriteResult.VersionConflict,
      );
    });

    it('updates when the expected version is the stored one', async () => {
      const { writer } = await factory();
      await writer.putPlacement(
        PlacementBuilder.aPlacement().build(),
        undefined,
      );
      const next = PlacementBuilder.aPlacement().withVersion(2).build();
      await expect(writer.putPlacement(next, 1)).resolves.toBe(
        DirectoryWriteResult.Written,
      );
    });

    it('reports a conflict when the expected version is stale', async () => {
      const { writer } = await factory();
      await writer.putPlacement(
        PlacementBuilder.aPlacement().build(),
        undefined,
      );
      await writer.putPlacement(
        PlacementBuilder.aPlacement().withVersion(2).build(),
        1,
      );
      const stale = PlacementBuilder.aPlacement().withVersion(2).build();
      await expect(writer.putPlacement(stale, 1)).resolves.toBe(
        DirectoryWriteResult.VersionConflict,
      );
    });

    it('rejects a dedicated tenant that takes a shard used by another tenant', async () => {
      const { writer } = await factory();
      await writer.putPlacement(
        PlacementBuilder.aPlacement().build(),
        undefined,
      );
      const dedicated = PlacementBuilder.aPlacement()
        .withTenantId(TestTenants.Two)
        .dedicated()
        .build();
      await expect(writer.putPlacement(dedicated, undefined)).resolves.toBe(
        DirectoryWriteResult.ShardTaken,
      );
    });

    it('rejects a normal tenant that lands on the shard of a dedicated tenant', async () => {
      const { writer } = await factory();
      await writer.putPlacement(
        PlacementBuilder.aPlacement()
          .withTenantId(TestTenants.Two)
          .withShardGroup('shard-9')
          .dedicated()
          .build(),
        undefined,
      );
      const normal = PlacementBuilder.aPlacement()
        .withTenantId(TestTenants.One)
        .withShardGroup('shard-9')
        .build();
      await expect(writer.putPlacement(normal, undefined)).resolves.toBe(
        DirectoryWriteResult.ShardTaken,
      );
    });

    it('lists only the placements of the requested region', async () => {
      const { writer, store } = await factory();
      const eu = PlacementBuilder.aPlacement().withRegion('eu').build();
      await writer.putPlacement(eu, undefined);
      await writer.putPlacement(
        PlacementBuilder.aPlacement()
          .withTenantId(TestTenants.Two)
          .withShardGroup('shard-2')
          .withRegion('us')
          .build(),
        undefined,
      );
      await expect(writer.listPlacements('eu')).resolves.toEqual([eu]);
      await expect(store.getPlacement(TestTenants.Two)).resolves.toBeDefined();
    });

    it('deletes a placement only at the expected version', async () => {
      const { writer, store } = await factory();
      await writer.putPlacement(
        PlacementBuilder.aPlacement().build(),
        undefined,
      );

      await expect(writer.deletePlacement(TestTenants.One, 2)).resolves.toBe(
        DirectoryWriteResult.VersionConflict,
      );
      await expect(store.getPlacement(TestTenants.One)).resolves.toBeDefined();
      await expect(writer.deletePlacement(TestTenants.One, 1)).resolves.toBe(
        DirectoryWriteResult.Written,
      );
      await expect(
        store.getPlacement(TestTenants.One),
      ).resolves.toBeUndefined();
      await expect(writer.deletePlacement(TestTenants.One, 1)).resolves.toBe(
        DirectoryWriteResult.VersionConflict,
      );
    });

    it('returns a seeded instance for its logical shard', async () => {
      const { store, seedInstance } = await factory();
      await seedInstance('shard-1', 'db-1');
      await expect(store.getInstance('shard-1')).resolves.toBe('db-1');
    });
  });
}
