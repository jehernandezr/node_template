import { Global, Module } from '@nestjs/common';
import {
  ValkeyCommandExecutor,
  ValkeyKeyspace,
} from '@platform/adapters-valkey';
import { EphemeralStore } from './ephemeral-store.js';
import { ValkeyEphemeralStore } from './valkey-ephemeral-store.js';

/** Datos de vida corta de identity en Valkey. */
@Global()
@Module({
  providers: [
    {
      provide: EphemeralStore,
      useFactory: (executor: ValkeyCommandExecutor, keyspace: ValkeyKeyspace) =>
        new ValkeyEphemeralStore(executor, keyspace),
      inject: [ValkeyCommandExecutor, ValkeyKeyspace],
    },
  ],
  exports: [EphemeralStore],
})
export class IdentityEphemeralModule {}
