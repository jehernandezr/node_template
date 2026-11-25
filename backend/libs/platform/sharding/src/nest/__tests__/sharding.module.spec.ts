import { KernelModule } from '@platform/kernel/nest';
import { Global, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { InProcessDirectoryChannel } from '../../in-process-directory-channel.js';
import { ShardAccess } from '../../model/shard-access.enum.js';
import { ShardDirectoryChangeKind } from '../../model/shard-directory-change-kind.enum.js';
import { ShardKey } from '../../model/shard-key.enum.js';
import { ShardingEvent } from '../../model/sharding-event.enum.js';
import { ShardRouter } from '../../shard-router.js';
import { ShardingErrorCode } from '../../errors/sharding-error-code.enum.js';
import { ShardingModule } from '../sharding.module.js';
import {
  CountingDirectoryStore,
  InMemoryRoutingCache,
  PlacementBuilder,
  TestTenants,
} from '../../__tests__/utils/index.js';

class RouterConsumer {}

@Global()
@Module({
  providers: [
    CountingDirectoryStore,
    {
      provide: InMemoryRoutingCache,
      useFactory: () => new InMemoryRoutingCache(),
    },
  ],
  exports: [CountingDirectoryStore, InMemoryRoutingCache],
})
class TestDirectoryModule {}

@Module({
  providers: [
    {
      provide: RouterConsumer,
      useFactory: (router: ShardRouter) => router,
      inject: [ShardRouter],
    },
  ],
})
class ConsumerModule {}

const REQUEST = {
  tenantId: TestTenants.One,
  keyKind: ShardKey.Tenant,
  access: ShardAccess.Read,
};

describe('ShardingModule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  const seedDirectory = (directory: CountingDirectoryStore): void => {
    directory.setPlacement(PlacementBuilder.aPlacement().build());
    directory.setInstance('shard-1', 'db-1');
  };

  describe('when the module is imported in the root', () => {
    it('resolves a tenant to its instance without a shared cache', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRoot({ directory: CountingDirectoryStore }),
        ],
      }).compile();
      seedDirectory(moduleRef.get(CountingDirectoryStore));
      const resolved = await moduleRef.get(ShardRouter).resolve(REQUEST);
      expect(resolved.instance).toBe('db-1');
    });

    it('provides the router to a module that does not import ShardingModule', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRoot({ directory: CountingDirectoryStore }),
          ConsumerModule,
        ],
      }).compile();
      expect(moduleRef.get(RouterConsumer)).toBe(moduleRef.get(ShardRouter));
    });
  });

  describe('when the module initializes', () => {
    it('subscribes the channel on init and not before', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRoot({ directory: CountingDirectoryStore }),
        ],
      }).compile();
      const channel = moduleRef.get(InProcessDirectoryChannel);
      expect(channel.subscriberCount).toBe(0);
      await moduleRef.init();
      expect(channel.subscriberCount).toBe(1);
    });
  });

  describe('when a placement change is published', () => {
    it('invalidates the cached placement', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRoot({ directory: CountingDirectoryStore }),
        ],
      }).compile();
      const directory = moduleRef.get(CountingDirectoryStore);
      seedDirectory(directory);
      await moduleRef.init();
      const router = moduleRef.get(ShardRouter);

      await router.resolve(REQUEST);
      expect(directory.placementReads).toBe(1);
      await moduleRef.get(InProcessDirectoryChannel).publish({
        type: ShardingEvent.ShardDirectoryChanged,
        kind: ShardDirectoryChangeKind.TenantPlacement,
        tenantId: TestTenants.One,
      });
      await router.resolve(REQUEST);
      expect(directory.placementReads).toBe(2);
    });
  });

  describe('when the module is closed', () => {
    it('closes the channel subscription', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRoot({ directory: CountingDirectoryStore }),
        ],
      }).compile();
      await moduleRef.init();
      const channel = moduleRef.get(InProcessDirectoryChannel);
      await moduleRef.close();
      moduleRef = undefined;
      expect(channel.subscriberCount).toBe(0);
    });
  });

  describe('when a shared routing cache is configured', () => {
    it('writes the resolved placement into it', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRoot({
            directory: CountingDirectoryStore,
            routingCache: InMemoryRoutingCache,
          }),
        ],
      }).compile();
      seedDirectory(moduleRef.get(CountingDirectoryStore));
      await moduleRef.get(ShardRouter).resolve(REQUEST);
      await expect(
        moduleRef
          .get(InMemoryRoutingCache)
          .get(`sharding:placement:${TestTenants.One}`),
      ).resolves.not.toBeUndefined();
    });
  });

  describe('when the options come from an async factory', () => {
    it('applies the router tuning and opens the subscription', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          KernelModule,
          TestDirectoryModule,
          ShardingModule.forRootAsync({
            useFactory: () => ({ router: { currentRegion: 'us' } }),
            directory: CountingDirectoryStore,
          }),
        ],
      }).compile();
      await moduleRef.init();
      seedDirectory(moduleRef.get(CountingDirectoryStore));

      await expect(
        moduleRef.get(ShardRouter).resolve(REQUEST),
      ).rejects.toMatchObject({ code: ShardingErrorCode.WrongRegion });
      expect(moduleRef.get(InProcessDirectoryChannel).subscriberCount).toBe(1);
    });
  });

  describe('when the directory is missing', () => {
    it('rejects the module definition', () => {
      expect(() => ShardingModule.forRoot({})).toThrow(
        expect.objectContaining({
          code: ShardingErrorCode.InvalidConfiguration,
        }),
      );
    });
  });
});
