import { InvalidParameters } from './bloom-error.js';
import {
  DEFAULT_FALSE_POSITIVE_RATE,
  requiredBits,
} from './optimal-parameters.js';

/**
 * Declaration of a named filter: how big it is, how wrong it may be and when it is rebuilt.
 * @typeParam TName caller-provided string enum of filter names.
 */
export interface BloomFilterDefinition<TName extends string = string> {
  readonly name: TName;
  /** Items the filter is sized for. Past it the false positive rate grows. */
  readonly expectedItems: number;
  /** Target false positive rate. Default {@link DEFAULT_FALSE_POSITIVE_RATE} (1 %). */
  readonly falsePositiveRate?: number;
  /**
   * Cron expression (five fields, or six with seconds, in UTC) of the scheduled job that rebuilds the
   * filter from its source of truth. A filter cannot forget items, so the rebuild is what drops removed
   * items and resets a filter that grew past `expectedItems`.
   */
  readonly rebuildCron: string;
}

/** A definition with its defaults applied and its values checked. */
export interface ResolvedBloomFilterDefinition<
  TName extends string = string,
> extends BloomFilterDefinition<TName> {
  readonly falsePositiveRate: number;
}

const CRON_FIELD = /^[0-9A-Za-z*/,?#-]+$/;

/**
 * Applies the default rate and validates a definition.
 * @throws {InvalidParameters} for an empty name, a bad size or rate, or a cron expression that does not have
 *   five or six fields.
 */
export function resolveBloomFilterDefinition<TName extends string>(
  definition: BloomFilterDefinition<TName>,
): ResolvedBloomFilterDefinition<TName> {
  if (typeof definition.name !== 'string' || definition.name.length === 0) {
    throw new InvalidParameters('name must be a non-empty string');
  }
  const falsePositiveRate =
    definition.falsePositiveRate ?? DEFAULT_FALSE_POSITIVE_RATE;
  // Validates expectedItems and the rate with the same rules as the sizing.
  requiredBits(definition.expectedItems, falsePositiveRate);
  const fields =
    typeof definition.rebuildCron === 'string'
      ? definition.rebuildCron.trim().split(/\s+/)
      : [];
  if (
    (fields.length !== 5 && fields.length !== 6) ||
    !fields.every((field) => CRON_FIELD.test(field))
  ) {
    throw new InvalidParameters(
      'rebuildCron must be a cron expression with five or six fields',
    );
  }
  return { ...definition, falsePositiveRate };
}
