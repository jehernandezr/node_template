import {
  Inject,
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from '@nestjs/common';
import { validateContract } from '@contracts/platform';
import { AppConfig, NodeEnv, ServiceConfig } from '@platform/config';
import { map, type Observable } from 'rxjs';
import type { HttpModuleOptions } from './http-module-options.js';
import { HttpRequestKey } from './http-metadata-key.enum.js';
import type { PipelineRequest } from './pipeline-request.js';
import { HTTP_OPTIONS } from './http.tokens.js';

/**
 * Validates the response against the route's schema. A deviation is a server error: it comes out as
 * `PLATFORM.INTERNAL.UNEXPECTED`. By default it runs outside production.
 */
@Injectable()
export class ContractOutputInterceptor implements NestInterceptor {
  private readonly enabled: boolean;

  constructor(
    @Inject(HTTP_OPTIONS) options: HttpModuleOptions,
    appConfig: AppConfig,
  ) {
    this.enabled =
      options.validateOutput ??
      appConfig.get(ServiceConfig).NODE_ENV !== NodeEnv.Production;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const call = context.switchToHttp().getRequest<PipelineRequest>()[
      HttpRequestKey.Call
    ];
    if (!this.enabled || call === undefined || call.route.response === null) {
      return next.handle();
    }
    const route = call.route;
    const schema = route.response;
    if (schema === null) {
      return next.handle();
    }
    return next.handle().pipe(
      map((value: unknown) => {
        const result = validateContract(schema, value);
        if (!result.ok) {
          const problems = result.errors
            .map((error) => `${error.field ?? '(root)'}:${error.code}`)
            .join(', ');
          throw new Error(
            `Response of ${route.id} does not match its contract: ${problems}`,
          );
        }
        return value;
      }),
    );
  }
}
