import { AuthStateSchemas } from '@platform/auth';
import { ValkeyCommand } from '../../valkey-command.enum.js';
import { ValkeyErrorCode } from '../../valkey-error-code.enum.js';
import { ValkeyAuthJson } from '../valkey-auth-json.js';

describe('ValkeyAuthJson', () => {
  describe('round trip', () => {
    it('reads back an encoded epoch', () => {
      const epoch = { revokedBefore: 1_700_000_000, suspended: true };

      expect(
        ValkeyAuthJson.parse(
          ValkeyCommand.Get,
          ValkeyAuthJson.encode(epoch),
          AuthStateSchemas.EPOCH,
        ),
      ).toEqual(epoch);
    });
  });

  describe('rejections', () => {
    it.each([
      ['a text that is not JSON', 'not json'],
      [
        'a JSON value that breaks the schema',
        JSON.stringify({ revokedBefore: -1, suspended: false }),
      ],
    ])('rejects %s with an unexpected reply', (_name, text) => {
      expect(() =>
        ValkeyAuthJson.parse(ValkeyCommand.Get, text, AuthStateSchemas.EPOCH),
      ).toThrow(
        expect.objectContaining({ code: ValkeyErrorCode.UnexpectedReply }),
      );
    });
  });
});
