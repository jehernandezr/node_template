import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { ActorGuards, type Actor } from '@platform/auth';
import { ActorType, RequestContextStore } from '@platform/observability';
import type { RequestContextInit } from '@platform/observability';
import { AppConfig } from '@platform/config';
import { Observable, throwError, map, timeout } from 'rxjs';
import { ClientChannel } from '../client-channel.enum.js';
import type { EndpointCall } from '../endpoint-call.js';
import { DeprecationHeaders } from '../deprecation-headers.js';
import { ExpressHttpExchange } from './express-http-exchange.js';
import { HttpConfig, type HttpSettings } from '../http.config.js';
import { HttpHeader } from '../http-header.enum.js';
import { HttpProblemError } from '../http-problem.error.js';
import { HttpRouteRegistry } from '../http-route-registry.js';
import { SessionCookieMode } from '../session-cookie-mode.enum.js';
import type { HttpExchange } from '../http-exchange.js';
import type { HttpResponseView } from '../http-response-view.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/**
 * Abre el `RequestContext` de la ruta con el tenant y el actor, aplica el tope de tiempo, escribe
 * `Api-Version` y las cabeceras de deprecación, y maneja la cookie de sesión del canal web.
 */
@Injectable()
export class EndpointContextInterceptor implements NestInterceptor {
  constructor(
    private readonly store: RequestContextStore,
    private readonly registry: HttpRouteRegistry,
    private readonly appConfig: AppConfig,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<PipelineRequest>();
    const call = request[HttpRequestKey.Call];
    if (call === undefined) {
      return next.handle();
    }
    const exchange = new ExpressHttpExchange(
      request,
      http.getResponse<HttpResponseView>(),
    );
    const settings = this.appConfig.get(HttpConfig);
    const current = this.store.current();
    const init: RequestContextInit = {
      ...(current?.traceId !== undefined && { traceId: current.traceId }),
      ...(current?.externalTraceId !== undefined && {
        externalTraceId: current.externalTraceId,
      }),
      debugSampled: current?.debugSampled ?? false,
      ...EndpointContextInterceptor.actorFields(call.actor),
    };
    return new Observable<unknown>((subscriber) =>
      this.store.run(init, () =>
        this.pipeline(next, call, exchange, settings).subscribe(subscriber),
      ),
    );
  }

  private pipeline(
    next: CallHandler,
    call: EndpointCall,
    exchange: HttpExchange,
    settings: HttpSettings,
  ): Observable<unknown> {
    const limited =
      call.options.timeoutMs === undefined
        ? next.handle()
        : next.handle().pipe(
            timeout({
              first: call.options.timeoutMs,
              with: () => throwError(() => HttpProblemError.timeout()),
            }),
          );
    return limited.pipe(
      map((value: unknown) => this.decorate(value, call, exchange, settings)),
    );
  }

  private decorate(
    value: unknown,
    call: EndpointCall,
    exchange: HttpExchange,
    settings: HttpSettings,
  ): unknown {
    exchange.setHeader(HttpHeader.ApiVersion, call.apiVersion);
    if (call.route.deprecated !== undefined) {
      const replacement = call.route.deprecated.replacement;
      const replacementPath =
        replacement === undefined
          ? undefined
          : this.registry.pathOfRoute(replacement);
      for (const [name, headerValue] of Object.entries(
        DeprecationHeaders.forRoute(call.route, replacementPath),
      )) {
        exchange.setHeader(name, headerValue);
      }
    }
    if (exchange.client.channel !== ClientChannel.Web) {
      return value;
    }
    return this.handleSessionCookie(value, call, exchange, settings);
  }

  private handleSessionCookie(
    value: unknown,
    call: EndpointCall,
    exchange: HttpExchange,
    settings: HttpSettings,
  ): unknown {
    const mode = call.options.sessionCookie ?? SessionCookieMode.None;
    if (mode === SessionCookieMode.Clear) {
      exchange.clearSessionCookie();
      return value;
    }
    if (mode !== SessionCookieMode.Issue && mode !== SessionCookieMode.Rotate) {
      return value;
    }
    const token = EndpointContextInterceptor.sessionTokenOf(value);
    if (token === undefined) {
      return value;
    }
    exchange.setSessionCookie(token, settings.SESSION_IDLE_TTL);
    return Object.fromEntries(
      Object.entries(value as object).filter(([key]) => key !== 'sessionToken'),
    );
  }

  private static sessionTokenOf(value: unknown): string | undefined {
    if (
      typeof value !== 'object' ||
      value === null ||
      !('sessionToken' in value)
    ) {
      return undefined;
    }
    return typeof value.sessionToken === 'string'
      ? value.sessionToken
      : undefined;
  }

  private static actorFields(
    actor: Actor | undefined,
  ): Omit<RequestContextInit, 'debugSampled' | 'traceId' | 'externalTraceId'> {
    if (actor === undefined) {
      return {};
    }
    if (ActorGuards.isUser(actor)) {
      return {
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorType: ActorType.User,
        userId: actor.userId,
        region: actor.region,
      };
    }
    if (ActorGuards.isServiceAccount(actor)) {
      return {
        tenantId: actor.tenantId,
        actorId: actor.serviceAccountId,
        actorType: ActorType.ServiceAccount,
      };
    }
    return { actorId: actor.name, actorType: ActorType.System };
  }
}
