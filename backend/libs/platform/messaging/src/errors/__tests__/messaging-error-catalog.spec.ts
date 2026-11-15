import { ErrorAudience } from '@contracts/platform';
import { messagingErrorCatalog } from '../messaging-error-catalog.js';
import { MessagingErrorCode } from '../messaging-error-code.enum.js';

describe('messagingErrorCatalog', () => {
  describe('when it is read', () => {
    const codes = messagingErrorCatalog.map((entry) => entry.code);

    it.each(Object.values(MessagingErrorCode))(
      'has an entry for %s',
      (code) => {
        expect(codes).toContain(code);
      },
    );

    it('has exactly one entry per code', () => {
      expect(codes).toHaveLength(Object.values(MessagingErrorCode).length);
    });
  });

  describe('when the audience is read', () => {
    it('exposes no code to the client, since every messaging code is internal', () => {
      const publicCodes = messagingErrorCatalog
        .filter((entry) => entry.audience === ErrorAudience.Public)
        .map((entry) => entry.code);

      expect(publicCodes).toEqual([]);
    });
  });
});
