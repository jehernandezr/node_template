import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AbstractHttpAdapter } from '@nestjs/core';
import type { INestApplicationContext } from '@nestjs/common';
import { SchedulingMode } from '@platform/scheduling';
import { ApiGatewayEventBuilder } from '../../../__tests__/utils/api-gateway-event.builder.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/service-definition.builder.js';
import type { HttpApplicationConfigurer } from '../../bootstrap/http-application-configurer.js';
import { RunningService } from '../../bootstrap/running-service.js';
import { ServiceBootstrap } from '../../bootstrap/service-bootstrap.js';
import { LambdaBootstrap } from '../lambda-bootstrap.js';

describe('LambdaBootstrap', () => {
  const definition = ServiceDefinitionBuilder.aDefinition('billing').build();
  let server: Server;
  let port: number;

  beforeAll(async () => {
    server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/plain' });
      response.end('pong');
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function runningOnLoopback(): RunningService {
    return new RunningService('billing', {} as INestApplicationContext, 1000, {
      host: '127.0.0.1',
      port,
    });
  }

  it('starts the service once for several invocations', async () => {
    const start = jest
      .spyOn(ServiceBootstrap, 'http')
      .mockResolvedValue(runningOnLoopback());
    const handler = LambdaBootstrap.http(definition);

    await handler(ApiGatewayEventBuilder.aRequest().build());
    await handler(ApiGatewayEventBuilder.aRequest().build());

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('forwards each event to the running service and answers its response', async () => {
    jest.spyOn(ServiceBootstrap, 'http').mockResolvedValue(runningOnLoopback());
    const handler = LambdaBootstrap.http(definition);

    const response = await handler(ApiGatewayEventBuilder.aRequest().build());

    expect(response).toMatchObject({ statusCode: 200, body: 'pong' });
  });

  it('forces loopback on port 0 and external scheduling, and keeps the caller options', async () => {
    const start = jest
      .spyOn(ServiceBootstrap, 'http')
      .mockResolvedValue(runningOnLoopback());
    const configurer: HttpApplicationConfigurer = { configure: jest.fn() };
    const adapter = {} as AbstractHttpAdapter;

    await LambdaBootstrap.http(definition, {
      http: { configurer, adapter, port: 3000, host: '0.0.0.0' },
    })(ApiGatewayEventBuilder.aRequest().build());

    expect(start).toHaveBeenCalledWith(
      definition,
      expect.objectContaining({
        schedulingMode: SchedulingMode.External,
        http: expect.objectContaining({
          host: '127.0.0.1',
          port: 0,
          configurer,
          adapter,
        }),
      }),
    );
  });

  it('keeps an explicit scheduling mode of the caller', async () => {
    const start = jest
      .spyOn(ServiceBootstrap, 'http')
      .mockResolvedValue(runningOnLoopback());

    await LambdaBootstrap.http(definition, {
      schedulingMode: SchedulingMode.InProcess,
    })(ApiGatewayEventBuilder.aRequest().build());

    expect(start).toHaveBeenCalledWith(
      definition,
      expect.objectContaining({ schedulingMode: SchedulingMode.InProcess }),
    );
  });

  it('retries the start after a failed first invocation', async () => {
    const start = jest
      .spyOn(ServiceBootstrap, 'http')
      .mockRejectedValueOnce(new Error('database unreachable'))
      .mockResolvedValue(runningOnLoopback());
    const handler = LambdaBootstrap.http(definition);

    await expect(
      handler(ApiGatewayEventBuilder.aRequest().build()),
    ).rejects.toThrow('database unreachable');
    const response = await handler(ApiGatewayEventBuilder.aRequest().build());

    expect(start).toHaveBeenCalledTimes(2);
    expect(response).toMatchObject({ statusCode: 200 });
  });
});
