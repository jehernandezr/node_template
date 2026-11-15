import type { OnApplicationBootstrap } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { InternalRouter } from '../server/internal-router.js';
import { BoundMethodHandler } from './bound-method-handler.js';
import { InternalHandlerMetadata } from './internal-handler.metadata.js';
import { PublishedContracts } from './published-contracts.js';

/**
 * Registra en el router los métodos decorados con `@InternalHandler` de todos
 * los providers y comprueba que cada operación publicada tenga el suyo, así un
 * servicio con una operación sin handler no arranca.
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
   * Recorre `discovery.getProviders()`; de cada instancia con prototipo recorre los métodos
   * (`scanner.getAllMethodNames`) y, por cada uno con `InternalHandlerMetadata.read(...)`,
   * hace `router.register(operación, new BoundMethodHandler(instancia, nombre))`. Al final
   * `router.assertComplete(published)`.
   * @throws InternalApiError `MissingHandler` o `DuplicateOperation`; hace fallar el arranque.
   */
  onApplicationBootstrap(): void {
    // Un mismo provider puede aparecer con varios tokens (por ejemplo, con `useExisting`).
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
