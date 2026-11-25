import {
  applyDecorators,
  HttpCode,
  RequestMapping,
  RequestMethod,
  SetMetadata,
} from '@nestjs/common';
import {
  AccessKind,
  HttpMethod,
  type RouteDefinition,
} from '@contracts/platform';
import type { EndpointOptions } from '../endpoint-options.js';
import type { EndpointMetadata } from './endpoint-metadata.js';
import { HttpMetadataKey } from './http-metadata-key.enum.js';

/** Writes the `@Endpoint` metadata. */
export class EndpointDecorator {
  private static readonly METHODS: Readonly<Record<HttpMethod, RequestMethod>> =
    {
      [HttpMethod.Get]: RequestMethod.GET,
      [HttpMethod.Post]: RequestMethod.POST,
      [HttpMethod.Put]: RequestMethod.PUT,
      [HttpMethod.Patch]: RequestMethod.PATCH,
      [HttpMethod.Delete]: RequestMethod.DELETE,
    };

  /** Converts the contract's `{param}` to Express `:param`. */
  static expressPath(path: string): string {
    return path.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, ':$1');
  }

  /**
   * Registers the contract method and path, the success code and the route metadata.
   * @throws Error if a public route declares `auth`: detected when the class loads.
   */
  static apply(
    route: RouteDefinition,
    options: EndpointOptions = {},
  ): MethodDecorator {
    if (route.access.kind === AccessKind.Public && options.auth !== undefined) {
      throw new Error(
        `Public route ${route.id} cannot declare auth in @Endpoint`,
      );
    }
    const metadata: EndpointMetadata = { route, options };
    return applyDecorators(
      RequestMapping({
        path: EndpointDecorator.expressPath(route.path),
        method: EndpointDecorator.METHODS[route.method],
      }),
      HttpCode(route.successStatus),
      SetMetadata(HttpMetadataKey.Endpoint, metadata),
    );
  }
}

/** `@Endpoint(route, opts?)` decorator for controller methods. */
export const Endpoint = EndpointDecorator.apply;
