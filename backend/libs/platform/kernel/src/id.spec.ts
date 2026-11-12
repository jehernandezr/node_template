import { Id } from './id.js';
import { InvalidIdError, KernelErrorCode } from './invalid-id.error.js';

describe('Id', () => {
  it('generates valid UUIDv7 values that are distinct', () => {
    const a = Id.generate();
    const b = Id.generate();
    expect(a.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(Id.from(a.toString()).equals(a)).toBe(true);
    expect(a.equals(b)).toBe(false);
  });

  it('accepts a valid UUIDv7 and normalizes it to lowercase', () => {
    const id = Id.from('0190F3A2-B4C5-7D6E-8F90-123456789ABC');
    expect(id.toString()).toBe('0190f3a2-b4c5-7d6e-8f90-123456789abc');
  });

  it.each([
    ['not a uuid', 'hello'],
    ['empty string', ''],
    ['UUIDv4', '3d9f0a5e-8b1c-4f2a-9d3e-5a6b7c8d9e0f'],
    ['wrong variant', '0190f3a2-b4c5-7d6e-0f90-123456789abc'],
    ['missing dashes', '0190f3a2b4c57d6e8f90123456789abc'],
  ])('rejects %s with InvalidIdError', (_label, value) => {
    expect(() => Id.from(value)).toThrow(InvalidIdError);
  });

  it('exposes the INVALID_ID code on the error', () => {
    let error: unknown;
    try {
      Id.from('nope');
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(InvalidIdError);
    expect((error as InvalidIdError).code).toBe(KernelErrorCode.InvalidId);
    expect((error as InvalidIdError).name).toBe('InvalidIdError');
  });

  it('decodes the creation timestamp from the UUIDv7 prefix', () => {
    // 0x0190f3a2b4c5 ms
    const id = Id.from('0190f3a2-b4c5-7d6e-8f90-123456789abc');
    expect(id.timestamp().getTime()).toBe(0x0190f3a2b4c5);
  });

  it('decodes timestamps of generated ids close to now', () => {
    const before = Date.now();
    const id = Id.generate();
    const after = Date.now();
    const ms = id.timestamp().getTime();
    expect(ms).toBeGreaterThanOrEqual(before);
    expect(ms).toBeLessThanOrEqual(after);
  });
});
