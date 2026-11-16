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
 * Arma la entrada de una ruta con sus partes crudas y la valida con el esquema del contrato. Es el
 * pipe de `@Input()`.
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

  /** Solo texto o listas de texto: lo demás no viene de una query. */
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
   * El session token de un canal web viaja en la cookie. En el canal nativo lo manda la app en el
   * cuerpo, así que nunca se completa desde la cookie.
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
