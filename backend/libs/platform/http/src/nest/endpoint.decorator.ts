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

/** Escribe los metadatos de `@Endpoint`. */
export class EndpointDecorator {
  private static readonly METHODS: Readonly<Record<HttpMethod, RequestMethod>> =
    {
      [HttpMethod.Get]: RequestMethod.GET,
      [HttpMethod.Post]: RequestMethod.POST,
      [HttpMethod.Put]: RequestMethod.PUT,
      [HttpMethod.Patch]: RequestMethod.PATCH,
      [HttpMethod.Delete]: RequestMethod.DELETE,
    };

  /** `{param}` del contrato a `:param` de Express. */
  static expressPath(path: string): string {
    return path.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, ':$1');
  }

  /**
   * Registra el método y el path del contrato, el código de éxito y los metadatos de la ruta.
   * @throws Error si una ruta pública declara `auth`: se detecta al cargar la clase.
   */
  static apply(
    route: RouteDefinition,
    options: EndpointOptions = {},
  ): MethodDecorator {
    if (route.access.kind === AccessKind.Public && options.auth !== undefined) {
      throw new Error(
        `La ruta pública ${route.id} no puede declarar auth en @Endpoint`,
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

/** Decorador `@Endpoint(route, opts?)` de los métodos de un controller. */
export const Endpoint = EndpointDecorator.apply;
