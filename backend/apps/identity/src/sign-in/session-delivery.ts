import { Injectable } from '@nestjs/common';
import type { SignInResponse } from '@contracts/identity';
import { ClientChannel, type HttpExchange } from '@platform/http';
import { IdentitySettings } from '../../config/identity-settings.js';

/**
 * Delivers the session token of a sign-in response according to the channel: on the web it goes only in the
 * `__Host-session` cookie, which lasts as long as the session's inactivity, and never in the body; in the native
 * app, in the body.
 */
@Injectable()
export class SessionDelivery {
  constructor(private readonly settings: IdentitySettings) {}

  deliver(response: SignInResponse, exchange: HttpExchange): SignInResponse {
    const sessionToken = response.tokens?.sessionToken;
    if (
      exchange.client.channel !== ClientChannel.Web ||
      response.tokens === undefined ||
      sessionToken === undefined
    ) {
      return response;
    }
    exchange.setSessionCookie(
      sessionToken,
      this.settings.values.SESSION_IDLE_TTL,
    );
    return {
      ...response,
      tokens: {
        accessToken: response.tokens.accessToken,
        accessExpiresAt: response.tokens.accessExpiresAt,
      },
    };
  }
}
