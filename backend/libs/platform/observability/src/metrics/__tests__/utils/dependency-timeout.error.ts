import { PlatformError } from '@platform/kernel';

/** Error de prueba con un código válido, como los que lanzan las dependencias de la plataforma. */
export class DependencyTimeoutError extends PlatformError {
  readonly code = 'PLATFORM.CACHE.TIMEOUT';
}
