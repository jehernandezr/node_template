import { InvalidationLog } from '../invalidation-log.js';

describe('InvalidationLog', () => {
  describe('when marking invalidations', () => {
    it('returns increasing sequences', () => {
      const log = new InvalidationLog(10);
      const first = log.mark('a');
      const second = log.mark('b');
      expect(second).toBeGreaterThan(first);
    });

    it('reports the last sequence as current', () => {
      const log = new InvalidationLog(10);
      log.mark('a');
      const last = log.mark('b');
      expect(log.current()).toBe(last);
    });
  });

  describe('when asking about a key', () => {
    it('answers 0 for a key never invalidated', () => {
      expect(new InvalidationLog(2).lastFor('a')).toBe(0);
    });

    it('answers the sequence of its last invalidation', () => {
      const log = new InvalidationLog(10);
      log.mark('a');
      const sequence = log.mark('a');
      expect(log.lastFor('a')).toBe(sequence);
    });

    it('is current when no invalidation came after the given sequence', () => {
      const log = new InvalidationLog(10);
      const sequence = log.mark('a');
      expect(log.isCurrent('a', sequence)).toBe(true);
    });

    it('is not current when an invalidation came after the given sequence', () => {
      const log = new InvalidationLog(10);
      const sequence = log.mark('a');
      log.mark('a');
      expect(log.isCurrent('a', sequence)).toBe(false);
    });
  });

  describe('when the capacity is exceeded', () => {
    it('answers with the highest evicted sequence for a forgotten key', () => {
      const log = new InvalidationLog(1);
      const evicted = log.mark('a');
      log.mark('b');
      expect(log.lastFor('a')).toBe(evicted);
    });

    it('keeps the exact sequence of a key still in the log', () => {
      const log = new InvalidationLog(1);
      log.mark('a');
      const latest = log.mark('b');
      expect(log.lastFor('b')).toBe(latest);
    });
  });
});
