import { SystemRandomSource } from '../system-random-source.js';

describe('SystemRandomSource', () => {
  const random = new SystemRandomSource();

  it('returns numbers in [0, 1)', () => {
    for (let index = 0; index < 200; index += 1) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('returns the requested number of bytes', () => {
    expect(random.bytes(0)).toHaveLength(0);
    expect(random.bytes(8)).toHaveLength(8);
  });

  it('returns different bytes on each call', () => {
    expect(
      Buffer.from(random.bytes(16)).equals(Buffer.from(random.bytes(16))),
    ).toBe(false);
  });
});
