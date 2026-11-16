import { HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { HealthState } from '@platform/kernel';
import { HealthRegistry } from '@platform/observability';
import { HealthEndpoints } from '../health-endpoints.controller.js';
import {
  ConnectionFailedError,
  ProbeErrorName,
  StubHealthCheck,
} from './utils/index.js';

describe('HealthEndpoints', () => {
  describe('live', () => {
    it('reports up without consulting the registered dependencies', () => {
      const registry = new HealthRegistry();
      registry.register(
        StubHealthCheck.failing('database', new ConnectionFailedError()),
      );

      expect(new HealthEndpoints(registry).live()).toEqual({
        state: HealthState.Up,
      });
    });
  });

  describe('ready', () => {
    describe('when every dependency is up', () => {
      it('returns the summary', async () => {
        const registry = new HealthRegistry();
        registry.register(
          StubHealthCheck.reporting('database', HealthState.Up),
        );

        await expect(new HealthEndpoints(registry).ready()).resolves.toEqual({
          state: HealthState.Up,
          checks: { database: { state: HealthState.Up } },
        });
      });
    });

    describe('when a dependency is degraded', () => {
      it('returns the summary without rejecting', async () => {
        const registry = new HealthRegistry();
        registry.register(
          StubHealthCheck.reporting('cache', HealthState.Degraded),
        );

        await expect(new HealthEndpoints(registry).ready()).resolves.toEqual({
          state: HealthState.Degraded,
          checks: { cache: { state: HealthState.Degraded } },
        });
      });
    });

    describe('when a dependency is down', () => {
      it('rejects with 503 and the summary as the body', async () => {
        const registry = new HealthRegistry();
        registry.register(
          StubHealthCheck.failing('database', new ConnectionFailedError()),
        );
        const summary = {
          state: HealthState.Down,
          checks: {
            database: {
              state: HealthState.Down,
              detail: ProbeErrorName.Connection,
            },
          },
        };

        const error = await new HealthEndpoints(registry)
          .ready()
          .catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ServiceUnavailableException);
        const exception = error as ServiceUnavailableException;
        expect(exception.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
        expect(exception.getResponse()).toEqual(summary);
      });
    });
  });
});
