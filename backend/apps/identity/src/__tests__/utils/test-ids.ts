import {
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';

/** New UUIDv7 ids for test inputs, like the ones the platform generates. */
export class TestIds {
  private static readonly generator = new UuidV7IdGenerator(
    new SystemClock(),
    new SystemRandomSource(),
  );

  static next(): string {
    return TestIds.generator.next().toString();
  }
}
