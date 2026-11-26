import { ClientChannel } from './client-channel.enum.js';
import { BearerTokenReader } from './bearer-token-reader.js';
import { HttpHeader } from './http-header.enum.js';
import { HttpLimits } from './http-limits.js';
import type { HttpRequestView } from './http-request-view.js';

/**
 * Decides the request's channel. The native app declares it with a session token in `Authorization` or
 * with `X-Session-Transport: bearer`; any other case is web.
 */
export class ClientChannelResolver {
  /**
   * Tells whether the client is the web or a native app, from its headers.
   * @param headers Request headers.
   * @returns The channel.
   */
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
