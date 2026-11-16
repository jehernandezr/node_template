/** Identificadores UUIDv7 fijos para que las pruebas sean reproducibles. */
export const Ids = {
  user: '0190f2a4-7b3c-7d4e-8f00-000000000001',
  tenant: '0190f2a4-7b3c-7d4e-8f00-000000000002',
  session: '0190f2a4-7b3c-7d4e-8f00-000000000003',
  device: '0190f2a4-7b3c-7d4e-8f00-000000000004',
  challenge: '0190f2a4-7b3c-7d4e-8f00-000000000005',
  group: '0190f2a4-7b3c-7d4e-8f00-000000000006',
  role: '0190f2a4-7b3c-7d4e-8f00-000000000007',
  invitation: '0190f2a4-7b3c-7d4e-8f00-000000000008',
  serviceAccount: '0190f2a4-7b3c-7d4e-8f00-000000000009',
  apiKey: '0190f2a4-7b3c-7d4e-8f00-00000000000a',
  passkey: '0190f2a4-7b3c-7d4e-8f00-00000000000b',
  alert: '0190f2a4-7b3c-7d4e-8f00-00000000000c',
  owner: '0190f2a4-7b3c-7d4e-8f00-00000000000d',
} as const;

/** Instante ISO 8601 fijo. */
export const Now = '2026-11-13T12:00:00.000Z';

/** UUID v4: no cumple el contrato, que exige v7. */
export const UuidV4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** Firma y nonce con alfabeto base64url y largo dentro del contrato. */
export const DeviceProof = {
  deviceId: 'device-key-0001',
  timestamp: Now,
  nonce: 'abcdefghijklmnop',
  signature: 'c2lnbmF0dXJl',
} as const;
