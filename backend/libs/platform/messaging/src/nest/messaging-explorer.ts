import { Injectable, type OnApplicationBootstrap } from '@nestjs/common';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import type { MessageEnvelope } from '../envelope/message-envelope.js';
import { MessageDispatcher } from '../dispatch/message-dispatcher.js';
import { SubscribeMetadata } from './subscribe-metadata.js';

/**
 * Discovers the methods decorated with `@Subscribe` across all providers and
 * registers them in the `MessageDispatcher`, so a consumer does not call `register`
 * by hand. Runs in `onApplicationBootstrap`, when all modules have already started.
 */
@Injectable()
export class MessagingExplorer implements OnApplicationBootstrap {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly scanner: MetadataScanner,
    private readonly dispatcher: MessageDispatcher,
  ) {}

  onApplicationBootstrap(): void {
    // The same provider can appear under several tokens (`useExisting`): it is registered once.
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

  /** Registers each decorated method of `instance` with `this` bound to the instance. */
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
