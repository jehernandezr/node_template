import { BloomSizing } from './bloom-sizing.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';

/** @deprecated Usa `InvalidParametersError`. */
export const InvalidParameters = InvalidParametersError;
/** @deprecated Usa `InvalidParametersError`. */
export type InvalidParameters = InvalidParametersError;

/** @deprecated Usa `BloomSizing.requiredBits`. */
export const requiredBits = BloomSizing.requiredBits;

/** @deprecated Usa `BloomSizing.DEFAULT_FALSE_POSITIVE_RATE`. */
export const DEFAULT_FALSE_POSITIVE_RATE =
  BloomSizing.DEFAULT_FALSE_POSITIVE_RATE;
