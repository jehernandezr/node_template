import { ApiKeyEnvironment } from '../api-key-environment.enum.js';
import { ApiKeyFormat } from '../api-key-format.js';

const SECRET = 'a'.repeat(32);
const PREFIX = 'abcdefgh';

describe('ApiKeyFormat', () => {
  describe('parse', () => {
    it('reads a live key', () => {
      expect(ApiKeyFormat.parse(`sk_live_${PREFIX}_${SECRET}`)).toEqual({
        environment: ApiKeyEnvironment.Live,
        prefix: PREFIX,
        secret: SECRET,
      });
    });

    it('reads a test key', () => {
      expect(ApiKeyFormat.parse(`sk_test_${PREFIX}_${SECRET}`)).toEqual({
        environment: ApiKeyEnvironment.Test,
        prefix: PREFIX,
        secret: SECRET,
      });
    });

    it.each([
      ['a prefix of 7 characters', `sk_live_${'a'.repeat(7)}_${SECRET}`],
      ['a prefix of 17 characters', `sk_live_${'a'.repeat(17)}_${SECRET}`],
      ['a secret of 31 characters', `sk_live_${PREFIX}_${'a'.repeat(31)}`],
      ['a secret of 65 characters', `sk_live_${PREFIX}_${'a'.repeat(65)}`],
      ['an unknown environment', `sk_prod_${PREFIX}_${SECRET}`],
      ['no sk_ prefix', `pk_live_${PREFIX}_${SECRET}`],
      [
        'a dash inside the secret',
        `sk_live_${PREFIX}_${'a'.repeat(16)}-${'a'.repeat(15)}`,
      ],
      ['an empty string', ''],
      ['a key longer than the limit', `sk_live_${PREFIX}_${'a'.repeat(120)}`],
    ])('returns undefined for %s', (_name, raw) => {
      expect(ApiKeyFormat.parse(raw)).toBeUndefined();
    });
  });

  describe('hashSecret', () => {
    it('is stable and returns 64 lowercase hexadecimal characters', () => {
      const hash = ApiKeyFormat.hashSecret(SECRET);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(ApiKeyFormat.hashSecret(SECRET)).toBe(hash);
    });

    it('gives different hashes for different secrets', () => {
      expect(ApiKeyFormat.hashSecret(SECRET)).not.toBe(
        ApiKeyFormat.hashSecret('b'.repeat(32)),
      );
    });
  });
});
