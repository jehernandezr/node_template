import type { TenantPlacement } from '../../model/tenant-placement.js';
import { PlacementBuilder, TestTenants } from '../../__tests__/utils/index.js';
import { PlacementCodec } from '../placement-codec.js';
import { SharedRecordKind } from '../shared-record-kind.enum.js';
import type { SharedRecord } from '../shared-record.js';

const VALID_PLACEMENT = {
  tenantId: TestTenants.One,
  region: 'eu',
  shardGroup: ['shard-1'],
  status: 'active',
  version: 1,
  dedicated: false,
};

describe('PlacementCodec', () => {
  describe('round trip', () => {
    it('decodes an encoded placement entry with its data', () => {
      const placement = PlacementBuilder.aPlacement()
        .withVersion(3)
        .dedicated()
        .build();

      const raw = PlacementCodec.encodeEntry({ placement, expiresAt: 1_000 });

      expect(PlacementCodec.decode(raw)).toEqual({
        kind: SharedRecordKind.Placement,
        entry: { placement, expiresAt: 1_000 },
      });
    });

    it('decodes an encoded tombstone with its cache version', () => {
      const raw = PlacementCodec.encodeTombstone({
        cacheVersion: 7,
        expiresAt: 2_000,
      });

      expect(PlacementCodec.decode(raw)).toEqual({
        kind: SharedRecordKind.Tombstone,
        tombstone: { cacheVersion: 7, expiresAt: 2_000 },
      });
    });
  });

  describe('decode of malformed values', () => {
    it.each<[string, string | undefined]>([
      ['broken JSON', '{"expiresAt": 1000'],
      ['a JSON string', '"5"'],
      ['an array', '[]'],
      ['no expiresAt', JSON.stringify({ placement: VALID_PLACEMENT })],
      [
        'an expiresAt that is not a finite number',
        JSON.stringify({ placement: VALID_PLACEMENT, expiresAt: null }),
      ],
      [
        'a placement with missing fields',
        JSON.stringify({
          placement: { tenantId: TestTenants.One },
          expiresAt: 1,
        }),
      ],
      [
        'an empty shard group',
        JSON.stringify({
          placement: { ...VALID_PLACEMENT, shardGroup: [] },
          expiresAt: 1,
        }),
      ],
      [
        'a shard group with an empty text',
        JSON.stringify({
          placement: { ...VALID_PLACEMENT, shardGroup: [''] },
          expiresAt: 1,
        }),
      ],
      [
        'an unknown status',
        JSON.stringify({
          placement: { ...VALID_PLACEMENT, status: 'frozen' },
          expiresAt: 1,
        }),
      ],
      [
        'a negative version',
        JSON.stringify({
          placement: { ...VALID_PLACEMENT, version: -1 },
          expiresAt: 1,
        }),
      ],
      [
        'a dedicated flag that is not a boolean',
        JSON.stringify({
          placement: { ...VALID_PLACEMENT, dedicated: 'yes' },
          expiresAt: 1,
        }),
      ],
      [
        'a tombstone without cacheVersion',
        JSON.stringify({ tombstone: true, expiresAt: 1 }),
      ],
      ['an undefined value', undefined],
    ])('returns undefined for %s', (_name, raw) => {
      expect(PlacementCodec.decode(raw)).toBeUndefined();
    });
  });

  describe('cacheVersion', () => {
    it.each([
      [0, 0],
      [1, 2],
      [5, 10],
    ])('maps placement version %i to cache version %i', (version, expected) => {
      expect(PlacementCodec.cacheVersion(version)).toBe(expected);
    });
  });

  describe('tombstoneVersion', () => {
    it.each<
      [
        string,
        TenantPlacement | undefined,
        SharedRecord | undefined,
        number | undefined,
        number,
      ]
    >([
      [
        'with nothing known, the unversioned tombstone',
        undefined,
        undefined,
        undefined,
        PlacementCodec.UNVERSIONED_TOMBSTONE_VERSION,
      ],
      [
        'with a local placement at version 3, 7',
        PlacementBuilder.aPlacement().withVersion(3).build(),
        undefined,
        undefined,
        7,
      ],
      [
        'with a shared placement at version 4, 9',
        undefined,
        {
          kind: SharedRecordKind.Placement,
          entry: {
            placement: PlacementBuilder.aPlacement().withVersion(4).build(),
            expiresAt: 1,
          },
        },
        undefined,
        9,
      ],
      [
        'with a shared tombstone at cache version 11, 12',
        undefined,
        {
          kind: SharedRecordKind.Tombstone,
          tombstone: { cacheVersion: 11, expiresAt: 1 },
        },
        undefined,
        12,
      ],
      ['with only a committed version 5, 9', undefined, undefined, 5, 9],
      [
        'with a local version 3 and a committed version 5, 9',
        PlacementBuilder.aPlacement().withVersion(3).build(),
        undefined,
        5,
        9,
      ],
      [
        'with a local version 2^52 capped at the safe integer limit',
        PlacementBuilder.aPlacement()
          .withVersion(2 ** 52)
          .build(),
        undefined,
        undefined,
        Number.MAX_SAFE_INTEGER,
      ],
    ])('%s', (_name, local, shared, committed, expected) => {
      expect(PlacementCodec.tombstoneVersion(local, shared, committed)).toBe(
        expected,
      );
    });
  });
});
