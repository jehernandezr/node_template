import type {
  DynamicModule,
  INestApplication,
  INestApplicationContext,
  NestApplicationOptions,
} from '@nestjs/common';
import { NestFactory, type AbstractHttpAdapter } from '@nestjs/core';
import { ServiceApplicationFactory } from './service-application-factory.js';

/** `ServiceApplicationFactory` over `NestFactory`, the one the services use. */
export class NestServiceApplicationFactory extends ServiceApplicationFactory {
  override http(
    module: DynamicModule,
    adapter: AbstractHttpAdapter | undefined,
    options: NestApplicationOptions,
  ): Promise<INestApplication> {
    return adapter === undefined
      ? NestFactory.create(module, options)
      : NestFactory.create(module, adapter, options);
  }

  override worker(
    module: DynamicModule,
    options: NestApplicationOptions,
  ): Promise<INestApplicationContext> {
    return NestFactory.createApplicationContext(module, options);
  }
}
