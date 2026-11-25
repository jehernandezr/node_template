import { PlatformError } from '@platform/kernel';

/** Test error with a valid code, like those thrown by platform dependencies. */
export class DependencyTimeoutError extends PlatformError {
  readonly code = 'PLATFORM.CACHE.TIMEOUT';
}
