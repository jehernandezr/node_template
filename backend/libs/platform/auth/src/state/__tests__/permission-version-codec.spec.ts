import { PermissionVersionCodec } from '../permission-version-codec.js';

describe('PermissionVersionCodec', () => {
  it('formats the tenant and user versions as the pv claim', () => {
    expect(PermissionVersionCodec.format({ tenant: 3, user: 7 })).toBe('3.7');
  });

  it('parses a formatted version back to the same pair', () => {
    const version = { tenant: 12, user: 900 };

    expect(
      PermissionVersionCodec.parse(PermissionVersionCodec.format(version)),
    ).toEqual(version);
  });

  it.each(['3', '3.', '.7', '3.7.1', '-1.2', 'a.b', ''])(
    'rejects %p',
    (text) => {
      expect(PermissionVersionCodec.parse(text)).toBeUndefined();
    },
  );
});
