import { ConfigValidationError } from '@platform/config';
import { ValkeyKeyspace } from '../valkey-keyspace.js';

describe('ValkeyKeyspace', () => {
  it('joins the parts under the prefix', () => {
    expect(new ValkeyKeyspace('svc').key('a', 'b')).toBe('svc:a:b');
  });

  it.each([[''], ['a:b'], ['with space'], ['x'.repeat(65)]])(
    'rejects the prefix %p, which the ACL cannot express',
    (prefix) => {
      expect(() => new ValkeyKeyspace(prefix)).toThrow(ConfigValidationError);
    },
  );

  describe('fromSettings', () => {
    it('uses the service name when there is no explicit prefix', () => {
      expect(
        ValkeyKeyspace.fromSettings({ VALKEY_KEY_PREFIX: undefined }, 'orders')
          .prefix,
      ).toBe('orders');
    });

    it('prefers VALKEY_KEY_PREFIX over the service name', () => {
      expect(
        ValkeyKeyspace.fromSettings({ VALKEY_KEY_PREFIX: 'identity' }, 'orders')
          .prefix,
      ).toBe('identity');
    });

    it.each([
      [undefined, 'not valid', 'SERVICE_NAME'],
      ['not valid', 'orders', 'VALKEY_KEY_PREFIX'],
    ])(
      'names the variable the invalid prefix came from (%p, %p)',
      (explicit, service, path) => {
        let error: unknown;
        try {
          ValkeyKeyspace.fromSettings({ VALKEY_KEY_PREFIX: explicit }, service);
        } catch (caught) {
          error = caught;
        }
        expect(error).toBeInstanceOf(ConfigValidationError);
        expect(
          (error as ConfigValidationError).issues.map((issue) => issue.path),
        ).toEqual([path]);
      },
    );
  });
});
