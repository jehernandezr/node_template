import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InternalRouter } from '../server/internal-router.js';
import { BoundMethodHandler } from './bound-method-handler.js';
import { InternalHandlerMetadata } from './internal-handler.metadata.js';
import { PublishedContracts } from './published-contracts.js';

/**
 * Registers in the router the methods decorated with `@InternalHandler` from all
 * providers and checks that each published operation has its own, so a
 * service with an operation without a handler does not start.
 */
@Injectable()
export class InternalHandlerExplorer implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly router: InternalRouter,
    private readonly published: PublishedContracts,
  ) {}

  /**
   * Walks `discovery.getProviders()`; for each instance with a prototype it walks the methods
   * (`scanner.getAllMethodNames`) and, for each one with `InternalHandlerMetadata.read(...)`,
   * calls `router.register(operation, new BoundMethodHandler(instance, name))`. At the end
   * `router.assertComplete(published)`.
   * The same provider can appear under several tokens (for example, with `useExisting`).
   * @throws InternalApiError `MissingHandler` or `DuplicateOperation`; it makes startup fail.
   */
  onApplicationBootstrap(): void {
    const seen = new Set<object>();
    for (const wrapper of this.discovery.getProviders()) {
      const instance: unknown = wrapper.instance;
      if (
        typeof instance !== 'object' ||
        instance === null ||
        seen.has(instance)
      ) {
        continue;
      }
      seen.add(instance);
      const prototype: unknown = Object.getPrototypeOf(instance);
      if (prototype === null) {
        continue;
      }
      for (const methodName of this.scanner.getAllMethodNames(
        prototype as object,
      )) {
        const operation = InternalHandlerMetadata.read(
          (instance as Record<string, unknown>)[methodName],
        );
        if (operation !== undefined) {
          this.router.register(
            operation,
            new BoundMethodHandler(instance, methodName),
          );
        }
      }
    }
    this.router.assertComplete(this.published);
  }
}
