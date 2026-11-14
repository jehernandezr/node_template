import { RedactionRules } from '../redaction-rules.js';

describe('RedactionRules', () => {
  describe('defaults', () => {
    it.each([
      ['sensitiveLastWords', 'password'],
      ['sensitiveLastWords', 'token'],
    ] as const)('includes %s with %s', (list, word) => {
      expect(RedactionRules.defaults().lists[list].has(word)).toBe(true);
    });

    it('returns new sets on each call so no instance shares state', () => {
      const first = RedactionRules.defaults();
      const second = RedactionRules.defaults();

      expect(first.lists.sensitiveLastWords).not.toBe(
        second.lists.sensitiveLastWords,
      );
      expect(first.lists.sensitiveLastWords).toEqual(
        second.lists.sensitiveLastWords,
      );
    });
  });

  describe('extend', () => {
    it('adds the word in lowercase to the sensitive last words', () => {
      const extended = RedactionRules.defaults().extend(['Pasaporte']);

      expect(extended.lists.sensitiveLastWords.has('pasaporte')).toBe(true);
    });

    it('does not mutate the original rules', () => {
      const original = RedactionRules.defaults();

      original.extend(['pasaporte']);

      expect(original.lists.sensitiveLastWords.has('pasaporte')).toBe(false);
    });

    it('keeps the other lists of the original rules', () => {
      const original = RedactionRules.defaults();

      const extended = original.extend(['pasaporte']);

      expect(extended.lists.publicLastWords).toEqual(
        original.lists.publicLastWords,
      );
      expect(extended.lists.sensitiveLastWords.has('password')).toBe(true);
    });
  });
});
