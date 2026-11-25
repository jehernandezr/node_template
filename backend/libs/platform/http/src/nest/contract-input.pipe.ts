import { Injectable, type PipeTransform } from '@nestjs/common';
import {
  HttpMethod,
  PlatformErrorCode,
  QueryParamsCodec,
  validateContract,
  type RawQueryValue,
  type RouteDefinition,
} from '@contracts/platform';
import { HttpProblemError } from '../http-problem.error.js';
import type { RawEndpointInput } from './raw-endpoint-input.js';
import { SessionCookieMode } from '../session-cookie-mode.enum.js';
import { ClientChannel } from '../client-channel.enum.js';

/**
 * Builds a route's input from its raw parts and validates it with the contract schema. It is the
 * `@Input()` pipe.
 */
@Injectable()
export class ContractInputPipe implements PipeTransform<RawEndpointInput> {
  transform(value: RawEndpointInput): unknown {
    const { route, options, params, exchange } = value;
    const isQuery =
      route.method === HttpMethod.Get || route.method === HttpMethod.Delete;
    const payload = isQuery
      ? new QueryParamsCodec().decode(
          route,
          ContractInputPipe.rawQuery(value.query),
        )
      : ContractInputPipe.bodyOf(value.body);
    const source: Record<string, unknown> = { ...payload, ...params };
    if (
      ContractInputPipe.takesSessionFromCookie(
        route,
        options.sessionCookie,
        exchange.client.channel,
      ) &&
      source['sessionToken'] === undefined
    ) {
      const cookieToken = exchange.sessionCookie();
      if (cookieToken !== undefined) {
        source['sessionToken'] = cookieToken;
      }
    }
    const result = validateContract(route.request, source);
    if (!result.ok) {
      throw HttpProblemError.invalidInput(result.errors);
    }
    return result.value;
  }

  /** Only text or lists of text: anything else does not come from a query. */
  private static rawQuery(
    query: Readonly<Record<string, unknown>>,
  ): Record<string, RawQueryValue> {
    const result: Record<string, RawQueryValue> = {};
    for (const [name, value] of Object.entries(query)) {
      if (typeof value === 'string') {
        result[name] = value;
      } else if (
        Array.isArray(value) &&
        value.every((item) => typeof item === 'string')
      ) {
        result[name] = value;
      }
    }
    return result;
  }

  private static bodyOf(body: unknown): Record<string, unknown> {
    if (body === undefined) {
      return {};
    }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      throw HttpProblemError.invalidInput([
        { code: PlatformErrorCode.ValidationInvalidType },
      ]);
    }
    return { ...body };
  }

  /**
   * The session token of a web channel travels in the cookie. In the native channel the app sends it in the
   * body, so it is never filled in from the cookie.
   */
  private static takesSessionFromCookie(
    route: RouteDefinition,
    mode: SessionCookieMode | undefined,
    channel: ClientChannel,
  ): boolean {
    const readsCookie =
      mode === SessionCookieMode.Rotate || mode === SessionCookieMode.Clear;
    return (
      readsCookie &&
      'sessionToken' in route.request.shape &&
      channel === ClientChannel.Web
    );
  }
}
