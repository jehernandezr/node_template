import { KernelErrorCode } from '../../errors/kernel-error-code.enum.js';
import { InvalidTenantIdError } from '../invalid-tenant-id.error.js';
import { TenantId } from '../tenant-id.js';

const UUID = '01941f29-7c00-7000-8000-000000000001';

describe('TenantId', () => {
  it('accepts a UUIDv7 and lowercases it', () => {
    const tenant = TenantId.from(UUID.toUpperCase());
    expect(tenant.value).toBe(UUID);
    expect(tenant.toString()).toBe(UUID);
    expect(tenant.equals(TenantId.from(UUID))).toBe(true);
  });

  it('accepts a custom pattern up to the maximum length', () => {
    const raw = 'a'.repeat(TenantId.MAX_LENGTH);
    expect(TenantId.from(raw, /^a+$/).value).toBe(raw);
  });

  it.each([
    ['empty', ''],
    ['too long', 'a'.repeat(TenantId.MAX_LENGTH + 1)],
    ['bad format', 'not-a-uuid'],
    ['non-string', 5 as unknown as string],
  ])('rejects %s', (reason, raw) => {
    expect(() => TenantId.from(raw, /^[a-z]+$/)).toThrow(InvalidTenantIdError);
    expect(() => TenantId.from(raw)).toThrow(InvalidTenantIdError);
    expect(reason).toBeDefined();
  });

  it('uses the kernel code and does not include the received value', () => {
    try {
      TenantId.from('secret tenant');
      throw new Error('should have thrown');
    } catch (error) {
      expect((error as InvalidTenantIdError).code).toBe(
        KernelErrorCode.InvalidTenantId,
      );
      expect((error as Error).message).not.toContain('secret');
    }
  });
});
