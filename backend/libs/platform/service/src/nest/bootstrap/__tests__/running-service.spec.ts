import { NestFactory } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { ServiceErrorCode } from '../../../errors/service-error-code.enum.js';
import { RunningService } from '../running-service.js';
import { EmptyHostModule } from './utils/empty-host-module.js';

describe('RunningService', () => {
  let app: INestApplicationContext;

  beforeEach(async () => {
    app = await NestFactory.createApplicationContext(EmptyHostModule, {
      logger: false,
    });
  });

  afterEach(async () => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    await app.close();
  });

  it('closes the application once and returns the same promise to every caller', async () => {
    const close = jest.spyOn(app, 'close').mockResolvedValue(undefined);
    const service = new RunningService('identity', app, 1_000);

    const first = service.stop();
    const second = service.stop();

    expect(second).toBe(first);
    await first;
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('rejects with the shutdown timeout code when close outlives the grace period', async () => {
    jest
      .spyOn(app, 'close')
      .mockReturnValue(new Promise<void>(() => undefined));
    const service = new RunningService('identity', app, 20);

    await expect(service.stop()).rejects.toMatchObject({
      code: ServiceErrorCode.ShutdownTimeout,
      details: { serviceName: 'identity', graceMs: 20 },
    });
  });

  it('clears its timer when the application closes within the grace period', async () => {
    jest.useFakeTimers();
    jest.spyOn(app, 'close').mockResolvedValue(undefined);
    const service = new RunningService('identity', app, 10_000);

    await service.stop();

    expect(jest.getTimerCount()).toBe(0);
  });
});
