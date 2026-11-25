import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  type Type,
} from '@nestjs/common';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { ErrorCatalogRegistry } from '../error-catalog-registry.js';
import { HttpRouteRegistry } from '../http-route-registry.js';
import type { HttpModuleOptions } from './http-module-options.js';
import { HTTP_OPTIONS } from './http.tokens.js';
import type { EndpointMetadata } from './endpoint-metadata.js';
import { HttpMetadataKey } from './http-metadata-key.enum.js';
import type { ResourceMetadata } from './resource-metadata.js';

/**
 * Registers each handler with `@Endpoint` in the route registry and checks, at startup, that the
 * contract has all its routes and that the catalog covers all its error codes.
 */
@Injectable()
export class HttpRouteExplorer implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly reflector: Reflector,
    private readonly registry: HttpRouteRegistry,
    private readonly catalogs: ErrorCatalogRegistry,
    @Inject(HTTP_OPTIONS) private readonly options: HttpModuleOptions,
  ) {}

  onApplicationBootstrap(): void {
    for (const wrapper of this.discovery.getControllers()) {
      const metatype = wrapper.metatype;
      if (metatype === null || metatype === undefined) {
        continue;
      }
      this.registerController(metatype as Type<unknown>);
    }
    this.registry.assertComplete(this.options.contract);
    this.catalogs.assertCovers(this.options.contract);
  }

  private registerController(metatype: Type<unknown>): void {
    const prototype: object = metatype.prototype as object;
    const resource = this.reflector.get<ResourceMetadata | undefined>(
      HttpMetadataKey.Resource,
      metatype,
    ) ?? { name: metatype.name, options: {} };
    for (const handlerName of this.scanner.getAllMethodNames(prototype)) {
      const handler: unknown = Reflect.get(prototype, handlerName);
      if (typeof handler !== 'function') {
        continue;
      }
      const endpoint = this.reflector.get<EndpointMetadata | undefined>(
        HttpMetadataKey.Endpoint,
        handler,
      );
      if (endpoint === undefined) {
        continue;
      }
      this.registry.register({
        route: endpoint.route,
        options: endpoint.options,
        resource,
        controller: metatype.name,
        handler: handlerName,
      });
    }
  }
}
