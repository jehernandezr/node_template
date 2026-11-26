import type {
  DynamicModule,
  INestApplicationContext,
  NestApplicationOptions,
} from '@nestjs/common';

/** Creates the Nest application context a one-off command, such as the migrations, runs in. */
export abstract class ApplicationContextFactory {
  /**
   * Creates and initializes the context of a module.
   * @param module Root module of the context.
   * @param options Nest options of the context.
   * @returns The initialized context; the caller closes it.
   */
  abstract create(
    module: DynamicModule,
    options: NestApplicationOptions,
  ): Promise<INestApplicationContext>;
}
