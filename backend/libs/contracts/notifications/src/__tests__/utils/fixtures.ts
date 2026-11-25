/** Fixed UUIDv7 identifiers so tests are reproducible. */
export const Ids = {
  user: '0190f2a4-7b3c-7d4e-8f00-000000000001',
  tenant: '0190f2a4-7b3c-7d4e-8f00-000000000002',
  item: '0190f2a4-7b3c-7d4e-8f00-000000000003',
  other: '0190f2a4-7b3c-7d4e-8f00-000000000004',
} as const;

/** Instante ISO 8601 fijo. */
export const Now = '2026-11-13T12:00:00.000Z';

/** UUID v4: does not meet the contract, which requires v7. */
export const UuidV4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
