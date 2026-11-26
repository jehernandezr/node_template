import { SignInStatus } from '@contracts/identity';
import { ClientChannel, HttpExchange, type ClientInfo } from '@platform/http';
import { StaticAppConfig } from '../../__tests__/utils/index.js';
import { IdentitySettings } from '../../config/identity-settings.js';
import { SessionDelivery } from '../session-delivery.js';
import { SignInResponses } from '../../shared/utils/sign-in-responses.js';

/** HTTP exchange that records the cookies it would set on the response. */
class RecordingExchange extends HttpExchange {
  readonly cookies: Array<{ token: string; maxAgeMs: number }> = [];

  constructor(readonly client: ClientInfo) {
    super();
  }

  sessionCookie(): string | undefined {
    return undefined;
  }

  setSessionCookie(token: string, maxAgeMs: number): void {
    this.cookies.push({ token, maxAgeMs });
  }

  clearSessionCookie(): void {
    return undefined;
  }

  setHeader(): void {
    return undefined;
  }
}

const SESSION = {
  accessToken: 'jwt',
  accessExpiresAt: new Date('2026-11-16T10:10:00.000Z'),
  sessionToken: 'st1_token',
};

describe('SessionDelivery', () => {
  const delivery = new SessionDelivery(
    new IdentitySettings(new StaticAppConfig({ SESSION_IDLE_TTL: 1_000 })),
  );

  it('moves the session token to the cookie for a web client', () => {
    const exchange = new RecordingExchange({
      ip: '',
      channel: ClientChannel.Web,
    });

    const response = delivery.deliver(
      SignInResponses.authenticated(SESSION, { region: 'eu' }),
      exchange,
    );

    expect(response.tokens).toEqual({
      accessToken: 'jwt',
      accessExpiresAt: '2026-11-16T10:10:00.000Z',
    });
    expect(exchange.cookies).toEqual([{ token: 'st1_token', maxAgeMs: 1_000 }]);
  });

  it('keeps the token in the body for the native app and leaves pending MFA untouched', () => {
    const native = new RecordingExchange({
      ip: '',
      channel: ClientChannel.Native,
    });
    const web = new RecordingExchange({ ip: '', channel: ClientChannel.Web });
    const pending = SignInResponses.mfaRequired({
      mfaToken: 'mf1_x',
      methods: [],
    });

    expect(
      delivery.deliver(
        SignInResponses.authenticated(SESSION, { region: 'eu' }),
        native,
      ).tokens,
    ).toMatchObject({ sessionToken: 'st1_token' });
    expect(delivery.deliver(pending, web)).toEqual({
      status: SignInStatus.MfaRequired,
      mfa: { mfaToken: 'mf1_x', methods: [] },
    });
    expect(web.cookies).toEqual([]);
  });
});
