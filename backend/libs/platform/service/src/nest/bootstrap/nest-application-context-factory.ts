import type {
  DynamicModule,
  INestApplicationContext,
  NestApplicationOptions,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ApplicationContextFactory } from './application-context-factory.js';

/** `ApplicationContextFactory` over `NestFactory`, the one the services use. */
export class NestApplicationContextFactory extends ApplicationContextFactory {
  override create(
    module: DynamicModule,
    options: NestApplicationOptions,
  ): Promise<INestApplicationContext> {
    return NestFactory.createApplicationContext(module, options);
  }
}
