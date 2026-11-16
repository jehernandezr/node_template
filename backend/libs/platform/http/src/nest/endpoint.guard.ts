import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { AccessKind, type RouteDefinition } from '@contracts/platform';
import { ActorGuards, type Actor } from '@platform/auth';
import { Clock } from '@platform/kernel';
import { ApiVersionPolicy } from '../api-version.policy.js';
import type { EndpointCall } from '../endpoint-call.js';
import { AuthMethod } from '../auth-method.enum.js';
import { DeprecationHeaders } from '../deprecation-headers.js';
import { EndpointAuthorizer } from '../endpoint-authorizer.js';
import type { EndpointOptions, ResourceOptions } from '../endpoint-options.js';
import { HttpHeader } from '../http-header.enum.js';
import { HttpProblemError } from '../http-problem.error.js';
import { RateLimitGate } from '../rate-limit-gate.js';
import { RateLimitTier } from '../rate-limit-tier.enum.js';
import { RequestAuthenticator } from '../request-authenticator.js';
import { HttpEndpointReader } from './http-endpoint.reader.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';

/**
 * Autentica, aplica el tenant, el límite de tasa y el acceso, revisa el sunset y la versión de la
 * API, y deja en la petición la `EndpointCall` que usan el decorador `@CurrentActor()` y los
 * interceptores. Las rutas sin `@Endpoint` pasan sin tocar nada.
 */
@Injectable()
export class EndpointGuard implements CanActivate {
  constructor(
    private readonly endpoints: HttpEndpointReader,
    private readonly authenticator: RequestAuthenticator,
    private readonly authorizer: EndpointAuthorizer,
    private readonly gate: RateLimitGate,
    private readonly versions: ApiVersionPolicy,
    private readonly clock: Clock,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const found = this.endpoints.read(context);
    if (found === undefined) {
      return true;
    }
    const request = context.switchToHttp().getRequest<PipelineRequest>();
    const client = request[HttpRequestKey.ClientInfo];
    if (client === undefined) {
      throw new Error('ClientInfo missing: OriginPolicyMiddleware did not run');
    }
    const { route, options } = found.endpoint;
    const isPublic = route.access.kind === AccessKind.Public;

    const actor = isPublic
      ? undefined
      : await this.authenticator.authenticate(
          request.headers[HttpHeader.Authorization],
          options.auth ?? [AuthMethod.Jwt],
        );
    if (
      found.resource.options.tenantScoped &&
      !EndpointGuard.hasTenant(actor)
    ) {
      throw HttpProblemError.forbidden([]);
    }

    const tier =
      options.rateLimit ??
      (isPublic ? RateLimitTier.Auth : RateLimitTier.Standard);
    await this.gate.check(tier, RateLimitGate.keyFor(tier, client, actor));

    if (actor !== undefined) {
      await this.authorizer.authorize(route, actor);
    }
    if (DeprecationHeaders.isSunset(route, this.clock.now())) {
      throw HttpProblemError.versionSunset(route.id);
    }

    const apiVersion = this.versions.resolve(
      request.headers[HttpHeader.ApiVersion],
    );
    this.versions.assertAccepts(apiVersion, options.versions);

    request[HttpRequestKey.Call] = EndpointGuard.callFor(
      route,
      options,
      found.resource.options,
      apiVersion,
      actor,
    );
    return true;
  }

  private static hasTenant(actor: Actor | undefined): boolean {
    if (actor === undefined || ActorGuards.isSystem(actor)) {
      return false;
    }
    return actor.tenantId !== '';
  }

  private static callFor(
    route: RouteDefinition,
    options: EndpointOptions,
    resource: ResourceOptions,
    apiVersion: string,
    actor: Actor | undefined,
  ): EndpointCall {
    return {
      route,
      options,
      resource,
      apiVersion,
      ...(actor !== undefined && { actor }),
    };
  }
}
