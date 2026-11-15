import { Id, InvalidIdError } from '@platform/kernel';
import { IdTransformer } from '../transformers/id-transformer.js';
import { TimestampTransformer } from '../transformers/timestamp-transformer.js';

const UUID_V7 = '0193f1c2-0000-7000-8000-0000000000c3';
const UUID_V4 = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('IdTransformer', () => {
  const transformer = new IdTransformer();

  it('turns a UUIDv7 read from the database into an Id', () => {
    const id = transformer.from(UUID_V7);

    expect(id).toBeInstanceOf(Id);
    expect(id?.toString()).toBe(UUID_V7);
  });

  it('rejects a value read from the database that is not a UUIDv7', () => {
    expect(() => transformer.from(UUID_V4)).toThrow(InvalidIdError);
  });

  it('writes an Id or a string as its text', () => {
    expect(transformer.to(Id.from(UUID_V7))).toBe(UUID_V7);
    expect(transformer.to(UUID_V7)).toBe(UUID_V7);
  });

  it('passes null and undefined through in both directions', () => {
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeUndefined();
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeUndefined();
  });
});

describe('TimestampTransformer', () => {
  const transformer = new TimestampTransformer();

  it('keeps a Date as it is', () => {
    const instant = new Date('2026-11-14T10:00:00.000Z');

    expect(transformer.from(instant)).toBe(instant);
  });

  it('turns an ISO text from the driver into a Date', () => {
    const value = transformer.from('2026-11-14T10:00:00.000Z');

    expect(value).toBeInstanceOf(Date);
    expect(value?.toISOString()).toBe('2026-11-14T10:00:00.000Z');
  });

  it('passes null and undefined through in both directions', () => {
    expect(transformer.from(null)).toBeNull();
    expect(transformer.from(undefined)).toBeUndefined();
    expect(transformer.to(null)).toBeNull();
    expect(transformer.to(undefined)).toBeUndefined();
  });

  it('writes the Date unchanged', () => {
    const instant = new Date('2026-11-14T10:00:00.000Z');

    expect(transformer.to(instant)).toBe(instant);
  });
});
