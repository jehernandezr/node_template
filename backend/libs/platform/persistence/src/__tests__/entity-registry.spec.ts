import { DatabaseKind } from '../model/database-kind.enum.js';
import { EntityRegistry } from '../entity-registry.js';
import { ProbeEntity } from './utils/probe.entity.js';

class ReportEntity {}

describe('EntityRegistry', () => {
  describe('when entities are registered for a kind', () => {
    it('lists them for that kind only', () => {
      const registry = new EntityRegistry();

      registry.register(DatabaseKind.Shard, [ProbeEntity]);

      expect(registry.entities(DatabaseKind.Shard)).toEqual([ProbeEntity]);
      expect(registry.entities(DatabaseKind.Catalog)).toEqual([]);
    });
  });

  describe('when the same entity is registered twice', () => {
    it('lists it once', () => {
      const registry = new EntityRegistry();

      registry.register(DatabaseKind.Catalog, [ReportEntity]);
      registry.register(DatabaseKind.Catalog, [ReportEntity, ReportEntity]);

      expect(registry.entities(DatabaseKind.Catalog)).toEqual([ReportEntity]);
    });
  });
});
