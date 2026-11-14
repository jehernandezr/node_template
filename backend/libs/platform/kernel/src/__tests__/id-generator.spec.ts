import { UuidV7IdGenerator } from '../id-generator.js';

describe('UuidV7IdGenerator', () => {
  it('generates distinct UUIDv7 ids', () => {
    const gen = new UuidV7IdGenerator();
    const a = gen.next();
    const b = gen.next();
    expect(a.toString()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(a.equals(b)).toBe(false);
  });

  it('encodes the clock in the first 48 bits', () => {
    const at = Date.UTC(2026, 10, 14, 12, 30, 45, 123);
    const id = new UuidV7IdGenerator(() => at).next();
    expect(id.timestamp().getTime()).toBe(at);
  });

  it('keeps ids ordered within the same millisecond', () => {
    const gen = new UuidV7IdGenerator(() => 1_700_000_000_000);
    const ids = Array.from({ length: 5000 }, () => gen.next().toString());
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never goes back when the clock does', () => {
    let now = 1_700_000_000_500;
    const gen = new UuidV7IdGenerator(() => now);
    const first = gen.next();
    now -= 400;
    const second = gen.next();
    expect(second.toString() > first.toString()).toBe(true);
    expect(second.timestamp().getTime()).toBe(1_700_000_000_500);
  });
});
