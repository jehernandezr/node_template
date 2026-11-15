import { StubDataSource } from './utils/stub-data-source.js';
import { ProbeEntity } from './utils/probe.entity.js';
import { auditedOptionsOf } from '../metadata/entity-metadata.js';

describe('versioned and audited entities', () => {
  let metadata: ReturnType<StubDataSource['getMetadata']>;

  beforeEach(async () => {
    const dataSource = new StubDataSource('entities', [ProbeEntity]);
    await dataSource.initialize();
    metadata = dataSource.getMetadata(ProbeEntity);
  });

  it('maps every property to a snake_case column', () => {
    expect(metadata.findColumnWithPropertyName('tenantId')?.databaseName).toBe(
      'tenant_id',
    );
    expect(metadata.findColumnWithPropertyName('createdBy')?.databaseName).toBe(
      'created_by',
    );
    expect(metadata.findColumnWithPropertyName('updatedBy')?.databaseName).toBe(
      'updated_by',
    );
    expect(metadata.findColumnWithPropertyName('createdAt')?.databaseName).toBe(
      'created_at',
    );
    expect(metadata.findColumnWithPropertyName('name')?.databaseName).toBe(
      'name',
    );
  });

  it('marks the version column for optimistic locking', () => {
    expect(metadata.versionColumn?.propertyName).toBe('version');
  });

  it('marks deleted_at as the soft delete column', () => {
    expect(metadata.deleteDateColumn?.databaseName).toBe('deleted_at');
  });

  it('stores the create and update dates as timestamptz', () => {
    expect(metadata.createDateColumn?.type).toBe('timestamptz');
    expect(metadata.updateDateColumn?.type).toBe('timestamptz');
    expect(metadata.findColumnWithPropertyName('deletedAt')?.type).toBe(
      'timestamptz',
    );
  });

  it('requires a tenant on every row', () => {
    expect(metadata.findColumnWithPropertyName('tenantId')?.isNullable).toBe(
      false,
    );
  });

  it('keeps the @Audited options of the entity', () => {
    expect(auditedOptionsOf(ProbeEntity)).toBeDefined();
  });
});
