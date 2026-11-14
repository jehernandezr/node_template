import { shouldSampleDebug } from './sampling.js';

describe('shouldSampleDebug', () => {
  it('never samples when rate is 0 or negative', () => {
    expect(shouldSampleDebug(0, () => 0)).toBe(false);
    expect(shouldSampleDebug(-1, () => 0)).toBe(false);
  });

  it('always samples when rate is 1 or more', () => {
    expect(shouldSampleDebug(1, () => 0.999)).toBe(true);
    expect(shouldSampleDebug(2, () => 0.999)).toBe(true);
  });

  it('samples when the random value is below the rate', () => {
    expect(shouldSampleDebug(0.5, () => 0.49)).toBe(true);
  });

  it('does not sample when the random value is at or above the rate', () => {
    expect(shouldSampleDebug(0.5, () => 0.5)).toBe(false);
    expect(shouldSampleDebug(0.5, () => 0.9)).toBe(false);
  });

  it('uses Math.random by default', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.001);
    try {
      expect(shouldSampleDebug(0.01)).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
