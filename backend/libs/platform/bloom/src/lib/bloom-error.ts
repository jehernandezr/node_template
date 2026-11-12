import { PlatformError } from '@platform/kernel';

/** Stable error codes for the bloom filter library. */
export enum BloomErrorCode {
  InvalidParameters = 'PLATFORM.BLOOM.INVALID_PARAMETERS',
  CorruptedData = 'PLATFORM.BLOOM.CORRUPTED_DATA',
  IncompatibleFilters = 'PLATFORM.BLOOM.INCOMPATIBLE_FILTERS',
  UnknownFilter = 'PLATFORM.BLOOM.UNKNOWN_FILTER',
  DuplicateFilter = 'PLATFORM.BLOOM.DUPLICATE_FILTER',
}

/** Base class for every error thrown by this library. */
export class BloomError extends PlatformError {
  readonly code: BloomErrorCode;

  constructor(code: BloomErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

/** Thrown when sizing or construction parameters are out of range. */
export class InvalidParameters extends BloomError {
  constructor(message: string) {
    super(BloomErrorCode.InvalidParameters, message);
  }
}

/** Thrown when serialized or raw filter data does not match its declared size. */
export class CorruptedData extends BloomError {
  constructor(message: string) {
    super(BloomErrorCode.CorruptedData, message);
  }
}

/** Thrown when two filters with different parameters are combined. */
export class IncompatibleFilters extends BloomError {
  constructor(message: string) {
    super(BloomErrorCode.IncompatibleFilters, message);
  }
}

/** Thrown when a registry is asked for a filter name that was never registered. */
export class UnknownFilter extends BloomError {
  constructor(name: string) {
    super(BloomErrorCode.UnknownFilter, `Unknown bloom filter: ${name}`);
  }
}

/** Thrown when a registry name is registered twice. */
export class DuplicateFilter extends BloomError {
  constructor(name: string) {
    super(
      BloomErrorCode.DuplicateFilter,
      `Bloom filter already registered: ${name}`,
    );
  }
}
