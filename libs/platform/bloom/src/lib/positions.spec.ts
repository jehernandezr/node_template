import { bloomPositions } from './positions.js';

describe('bloomPositions', () => {
  // Pinned output of the enhanced double hashing scheme. Any change to the scheme must break this test.
  it('pins the exact bit positions for a fixed input and parameters', () => {
    expect(bloomPositions('pinned-item', 1000, 5)).toEqual([
      5, 568, 131, 695, 261,
    ]);
    expect(bloomPositions('pinned-item', 1_000_000, 7)).toEqual([
      900005, 991568, 83131, 174695, 266261, 357830, 449403,
    ]);
  });

  it('returns exactly k positions inside [0, m)', () => {
    const positions = bloomPositions('any', 97, 32);
    expect(positions).toHaveLength(32);
    for (const position of positions) {
      expect(position).toBeGreaterThanOrEqual(0);
      expect(position).toBeLessThan(97);
    }
  });
});
