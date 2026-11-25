import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import type { ResourceOptions } from '../endpoint-options.js';
import { HttpMetadataKey } from './http-metadata-key.enum.js';
import type { ResourceMetadata } from './resource-metadata.js';

/** Writes the `@Resource` metadata. */
export class ResourceDecorator {
  /**
   * `@Controller()` without a prefix plus the resource metadata. `name` is a value of a service enum.
   */
  static apply(name: string, options: ResourceOptions = {}): ClassDecorator {
    const metadata: ResourceMetadata = { name, options };
    return applyDecorators(
      Controller(),
      SetMetadata(HttpMetadataKey.Resource, metadata),
    );
  }
}

/** `@Resource(name, opts?)` decorator for controllers. */
export const Resource = ResourceDecorator.apply;
