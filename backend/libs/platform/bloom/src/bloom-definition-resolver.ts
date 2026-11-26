import type {
  BloomFilterDefinition,
  ResolvedBloomFilterDefinition,
} from './bloom-filter-definition.js';
import { BloomSizing } from './bloom-sizing.js';
import { InvalidParametersError } from './errors/invalid-parameters.error.js';

/** Applies the default values to a definition and validates it. */
export class BloomDefinitionResolver {
  private static readonly CRON_FIELD = /^[0-9A-Za-z*/,?#-]+$/;

  /**
   * Validates expectedItems and the rate with the same rules as the sizing.
   * @throws InvalidParametersError for an empty name, an invalid size or rate, or a
   * cron expression that has neither five nor six fields.
   */
  static resolve<TName extends string>(
    definition: BloomFilterDefinition<TName>,
  ): ResolvedBloomFilterDefinition<TName> {
    if (typeof definition.name !== 'string' || definition.name.length === 0) {
      throw new InvalidParametersError('name must be a non-empty string');
    }
    const falsePositiveRate =
      definition.falsePositiveRate ?? BloomSizing.DEFAULT_FALSE_POSITIVE_RATE;
    BloomSizing.requiredBits(definition.expectedItems, falsePositiveRate);
    const fields =
      typeof definition.rebuildCron === 'string'
        ? definition.rebuildCron.trim().split(/\s+/)
        : [];
    if (
      (fields.length !== 5 && fields.length !== 6) ||
      !fields.every((field) => BloomDefinitionResolver.CRON_FIELD.test(field))
    ) {
      throw new InvalidParametersError(
        'rebuildCron must be a cron expression with five or six fields',
      );
    }
    return { ...definition, falsePositiveRate };
  }
}
