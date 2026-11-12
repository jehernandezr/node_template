import {
  decodeSharedEntry,
  decodeSharedRecord,
  encodeSharedEntry,
  encodeTombstone,
  placementCacheVersion,
} from './placement-codec.js';
import { TenantStatus, type TenantPlacement } from './types.js';

const PLACEMENT: TenantPlacement = {
  tenantId: 't1',
  region: 'eu',
  shardGroup: ['shard-1'],
  status: TenantStatus.Active,
  version: 3,
  dedicated: false,
};

describe('placement codec', () => {
  it('round-trips a placement entry', () => {
    const raw = encodeSharedEntry({ placement: PLACEMENT, expiresAt: 10 });
    expect(decodeSharedRecord(raw)).toEqual({
      kind: 'placement',
      entry: { placement: PLACEMENT, expiresAt: 10 },
    });
    expect(decodeSharedEntry(raw)).toEqual({
      placement: PLACEMENT,
      expiresAt: 10,
    });
  });

  it('round-trips a tombstone and hides it from decodeSharedEntry', () => {
    const raw = encodeTombstone({ cacheVersion: 7, expiresAt: 20 });
    expect(decodeSharedRecord(raw)).toEqual({
      kind: 'tombstone',
      tombstone: { cacheVersion: 7, expiresAt: 20 },
    });
    expect(decodeSharedEntry(raw)).toBeUndefined();
  });

  it.each([
    ['a negative version', { tombstone: true, cacheVersion: -1, expiresAt: 1 }],
    [
      'a fractional version',
      { tombstone: true, cacheVersion: 1.5, expiresAt: 1 },
    ],
    ['a missing expiry', { tombstone: true, cacheVersion: 1 }],
  ])('treats a tombstone with %s as a miss', (_label, value) => {
    expect(decodeSharedRecord(JSON.stringify(value))).toBeUndefined();
  });

  it('places tombstones between placement versions', () => {
    expect(placementCacheVersion(1)).toBe(2);
    expect(placementCacheVersion(2) - 1).toBeGreaterThan(
      placementCacheVersion(1),
    );
    expect(placementCacheVersion(2) - 1).toBeLessThan(placementCacheVersion(2));
  });
});
