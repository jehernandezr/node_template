import { UuidV7IdGenerator } from './id-generator.js';

describe('UuidV7IdGenerator', () => {
  it('generates distinct UUIDv7 ids', () => {
    const gen = new UuidV7IdGenerator();
    const a = gen.next();
    const b = gen.next();
    expect(a.toString()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/);
    expect(a.equals(b)).toBe(false);
  });
});
