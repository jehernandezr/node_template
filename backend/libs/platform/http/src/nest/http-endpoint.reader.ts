import { Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { EndpointMetadata } from './endpoint-metadata.js';
import { HttpMetadataKey } from './http-metadata-key.enum.js';
import type { ResourceMetadata } from './resource-metadata.js';

/** Reads the `@Endpoint` and `@Resource` metadata of the current handler. */
@Injectable()
export class HttpEndpointReader {
  constructor(private readonly reflector: Reflector) {}

  read(
    context: ExecutionContext,
  ): { endpoint: EndpointMetadata; resource: ResourceMetadata } | undefined {
    const endpoint = this.reflector.get<EndpointMetadata | undefined>(
      HttpMetadataKey.Endpoint,
      context.getHandler(),
    );
    if (endpoint === undefined) {
      return undefined;
    }
    const controller = context.getClass();
    const resource = this.reflector.get<ResourceMetadata | undefined>(
      HttpMetadataKey.Resource,
      controller,
    ) ?? { name: controller.name, options: {} };
    return { endpoint, resource };
  }
}
