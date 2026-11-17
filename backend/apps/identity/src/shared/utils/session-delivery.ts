import { Injectable } from '@nestjs/common';
import type { SignInResponse } from '@contracts/identity';
import { ClientChannel, type HttpExchange } from '@platform/http';
import { IdentitySettings } from '../../config/identity-settings.js';

/**
 * Entrega el session token de una respuesta de inicio de sesión según el canal: en la web va solo en la
 * cookie `__Host-session`, que dura lo que la inactividad de la sesión, y nunca en el cuerpo; en la app
 * nativa, en el cuerpo.
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
