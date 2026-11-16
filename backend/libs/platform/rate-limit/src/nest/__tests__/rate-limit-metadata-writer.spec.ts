import 'reflect-metadata';
import {
  InvalidArgumentError,
  PrimitivesErrorCode,
} from '@platform/primitives';
import { RateLimitMetadataWriter } from '../rate-limit.metadata.js';

describe('RateLimitMetadataWriter', () => {
  it('returns a decorator for a valid rule and cost', () => {
    expect(
      typeof RateLimitMetadataWriter.decorate(
        { name: 'valid', limit: 3, windowMs: 1000 },
        { cost: 2 },
      ),
    ).toBe('function');
  });

  it('rejects an invalid rule with InvalidArgumentError', () => {
    expect(() =>
      RateLimitMetadataWriter.decorate({
        name: 'bad',
        limit: 0,
        windowMs: 1000,
      }),
    ).toThrow(
      expect.objectContaining({ code: PrimitivesErrorCode.InvalidArgument }),
    );
  });

  it('rejects a cost above the limit of the rule', () => {
    expect(() =>
      RateLimitMetadataWriter.decorate(
        { name: 'cost', limit: 2, windowMs: 1000 },
        { cost: 5 },
      ),
    ).toThrow(InvalidArgumentError);
  });
});
