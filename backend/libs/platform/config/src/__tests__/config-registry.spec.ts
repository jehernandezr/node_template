import { ConfigRegistry } from '../config-registry.js';
import { ConfigSection } from '../config-section.js';
import { z } from 'zod';

const COUNTS = new ConfigSection('counts', z.object({ LIMIT: z.number() }));
const OTHER = new ConfigSection('other', z.object({ NAME: z.string() }));

describe('ConfigRegistry', () => {
  it('registers a section and finds it by name', () => {
    const registry = new ConfigRegistry();

    registry.register(COUNTS, { LIMIT: 3 });

    expect(registry.find(COUNTS)).toEqual({ LIMIT: 3 });
  });

  it('keeps the first value when the same section is registered twice', () => {
    const registry = new ConfigRegistry();

    registry.register(COUNTS, { LIMIT: 3 });
    registry.register(COUNTS, { LIMIT: 9 });

    expect(registry.find(COUNTS)).toEqual({ LIMIT: 3 });
  });

  it('freezes the registered value', () => {
    const registry = new ConfigRegistry();

    registry.register(COUNTS, { LIMIT: 3 });
    const stored = registry.find(COUNTS);

    expect(Object.isFrozen(stored)).toBe(true);
    expect(() => {
      (stored as { LIMIT: number }).LIMIT = 4;
    }).toThrow(TypeError);
  });

  it('returns undefined for a section that was never registered', () => {
    const registry = new ConfigRegistry();

    expect(registry.find(OTHER)).toBeUndefined();
  });

  it('returns undefined for the root before setRoot', () => {
    expect(new ConfigRegistry().root()).toBeUndefined();
  });

  it('stores the root value frozen and returns it', () => {
    const registry = new ConfigRegistry();

    registry.setRoot({ FEATURE_FLAG: true });

    expect(registry.root()).toEqual({ FEATURE_FLAG: true });
    expect(Object.isFrozen(registry.root())).toBe(true);
  });

  it('keeps primitive root values as they are', () => {
    const registry = new ConfigRegistry();

    registry.setRoot('plain');

    expect(registry.root()).toBe('plain');
  });
});
