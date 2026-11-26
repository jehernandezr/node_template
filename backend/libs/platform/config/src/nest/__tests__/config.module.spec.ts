import { Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { z } from 'zod';
import { AppConfig } from '../../app-config.js';
import { ConfigSection } from '../../config-section.js';
import { ConfigErrorCode } from '../../errors/config-error-code.enum.js';
import { envBoolean, envNumber } from '../../env.js';
import { DeployEnvironment } from '../../enums/deploy-environment.enum.js';
import { NodeEnv } from '../../enums/node-env.enum.js';
import { ServiceConfig } from '../../sections/service.config.js';
import { ConfigModule } from '../config.module.js';

const BILLING = new ConfigSection(
  'billing',
  z.object({ BILLING_TIMEOUT_MS: envNumber({ min: 1 }).default(5000) }),
);

@Module({ imports: [ConfigModule.forFeature(ServiceConfig)] })
class AModule {}

@Module({ imports: [ConfigModule.forFeature(ServiceConfig)] })
class BModule {}

describe('ConfigModule', () => {
  it('provides the service section with defaults', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: { SERVICE_NAME: 'orders' } }),
        ConfigModule.forFeature(ServiceConfig),
      ],
    }).compile();

    const config = moduleRef.get(AppConfig).get(ServiceConfig);

    expect(config).toMatchObject({
      SERVICE_NAME: 'orders',
      NODE_ENV: NodeEnv.Development,
      DEPLOY_ENVIRONMENT: DeployEnvironment.Local,
    });
    await moduleRef.close();
  });

  it('exposes the values of a feature section declared by the service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          env: { SERVICE_NAME: 'orders', BILLING_TIMEOUT_MS: '250' },
        }),
        ConfigModule.forFeature(BILLING),
      ],
    }).compile();

    expect(moduleRef.get(AppConfig).get(BILLING)).toEqual({
      BILLING_TIMEOUT_MS: 250,
    });
    await moduleRef.close();
  });

  it('rejects the environment at compile time listing every invalid variable', async () => {
    const compiling = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          env: {
            SERVICE_NAME: '',
            NODE_ENV: 'nope',
            DEPLOY_ENVIRONMENT: 'mars',
          },
        }),
        ConfigModule.forFeature(ServiceConfig),
      ],
    }).compile();

    await expect(compiling).rejects.toMatchObject({
      code: ConfigErrorCode.Invalid,
    });
    await expect(compiling).rejects.toThrow(/SERVICE_NAME/);
    await expect(compiling).rejects.toThrow(/NODE_ENV/);
    await expect(compiling).rejects.toThrow(/DEPLOY_ENVIRONMENT/);
    await expect(compiling).rejects.not.toThrow(/nope|mars/);
  });

  it('returns the root schema values through AppConfig.root()', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          schema: z.object({ FEATURE_FLAG: envBoolean().default(false) }),
          env: {},
        }),
      ],
    }).compile();

    expect(moduleRef.get(AppConfig).root()).toEqual({ FEATURE_FLAG: false });
    await moduleRef.close();
  });

  it('falls back to the process environment when none is given', async () => {
    const previous = process.env['SERVICE_NAME'];
    process.env['SERVICE_NAME'] = 'from-process-env';
    try {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          ConfigModule.forFeature(ServiceConfig),
        ],
      }).compile();

      expect(moduleRef.get(AppConfig).get(ServiceConfig).SERVICE_NAME).toBe(
        'from-process-env',
      );
      await moduleRef.close();
    } finally {
      if (previous === undefined) {
        delete process.env['SERVICE_NAME'];
      } else {
        process.env['SERVICE_NAME'] = previous;
      }
    }
  });

  it('compiles two modules that import the same feature section', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: { SERVICE_NAME: 'orders' } }),
        AModule,
        BModule,
      ],
    }).compile();

    expect(moduleRef.get(AppConfig).get(ServiceConfig).SERVICE_NAME).toBe(
      'orders',
    );
    await moduleRef.close();
  });
});
