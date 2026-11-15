import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessageDispatcher } from '../dispatch/message-dispatcher.js';
import { SubscribeMetadata } from './subscribe-metadata.js';

/**
 * Descubre los métodos decorados con `@Subscribe` de todos los providers y los
 * registra en el `MessageDispatcher`, así un consumidor no llama a `register`
 * a mano. Corre en `onApplicationBootstrap`, cuando todos los módulos ya iniciaron.
 */
@Injectable()
export class MessagingExplorer implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly dispatcher: MessageDispatcher,
  ) {}

  onApplicationBootstrap(): void {
    // Un mismo provider puede aparecer bajo varios tokens (`useExisting`): se registra una vez.
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
      this.registerMethods(instance);
    }
  }

  /** Registra cada método decorado de `instance` con `this` ligado a la instancia. */
  private registerMethods(instance: object): void {
    const prototype: object | null = Object.getPrototypeOf(instance);
    if (prototype === null) {
      return;
    }
    for (const name of this.scanner.getAllMethodNames(prototype)) {
      const method = (instance as Record<string, unknown>)[name];
      const contract = SubscribeMetadata.contractOf(method);
      if (contract === undefined) {
        continue;
      }
      const handler = method as (
        data: unknown,
        envelope: MessageEnvelope,
      ) => unknown;
      this.dispatcher.register(contract, async (data, envelope) => {
        await handler.call(instance, data, envelope);
      });
    }
  }
}
