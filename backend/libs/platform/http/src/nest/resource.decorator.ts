import { applyDecorators, Controller, SetMetadata } from '@nestjs/common';
import type { ResourceOptions } from '../endpoint-options.js';
import { HttpMetadataKey } from './http-metadata-key.enum.js';
import type { ResourceMetadata } from './resource-metadata.js';

/** Escribe los metadatos de `@Resource`. */
export class ResourceDecorator {
  /**
   * `@Controller()` sin prefijo más los metadatos del recurso. `name` es un valor de un enum del servicio.
   */
  static apply(name: string, options: ResourceOptions = {}): ClassDecorator {
    const metadata: ResourceMetadata = { name, options };
    return applyDecorators(
      Controller(),
      SetMetadata(HttpMetadataKey.Resource, metadata),
    );
  }
}

/** Decorador `@Resource(name, opts?)` de los controllers. */
export const Resource = ResourceDecorator.apply;
