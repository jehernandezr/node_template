import {
  SystemClock,
  SystemRandomSource,
  UuidV7IdGenerator,
} from '@platform/kernel';

/** Ids UUIDv7 nuevos para las entradas de las pruebas, como los que genera la plataforma. */
export class TestIds {
  private static readonly generator = new UuidV7IdGenerator(
    new SystemClock(),
    new SystemRandomSource(),
  );

  static next(): string {
    return TestIds.generator.next().toString();
  }
}
