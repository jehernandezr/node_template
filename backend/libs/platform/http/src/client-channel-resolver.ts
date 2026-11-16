import { ClientChannel } from './client-channel.enum.js';
import { BearerTokenReader } from './bearer-token-reader.js';
import { HttpHeader } from './http-header.enum.js';
import { HttpLimits } from './http-limits.js';
import type { HttpRequestView } from './http-request-view.js';

/**
 * Decide el canal de la petición. La app nativa lo declara con un session token en `Authorization` o
 * con `X-Session-Transport: bearer`; cualquier otro caso es web.
 */
export class ClientChannelResolver {
  static resolve(headers: HttpRequestView['headers']): ClientChannel {
    const token = BearerTokenReader.read(headers[HttpHeader.Authorization]);
    const bearerSession =
      token !== undefined && BearerTokenReader.isSessionToken(token);
    const transport = headers[HttpHeader.SessionTransport];
    const declared =
      typeof transport === 'string' &&
      transport.toLowerCase() === HttpLimits.SESSION_TRANSPORT_BEARER;
    return bearerSession || declared ? ClientChannel.Native : ClientChannel.Web;
  }
}
