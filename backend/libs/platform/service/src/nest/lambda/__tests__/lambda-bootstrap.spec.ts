import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { SchedulingMode } from '@platform/scheduling';
import { ApiGatewayEventBuilder } from '../../../__tests__/utils/api-gateway-event.builder.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/service-definition.builder.js';
import { BootstrapStep } from '../../bootstrap/__tests__/utils/bootstrap-step.enum.js';
import { FakeNestApplication } from '../../bootstrap/__tests__/utils/fake-nest-application.js';
import { ModuleTree } from '../../bootstrap/__tests__/utils/module-tree.js';
import { RecordingApplicationFactory } from '../../bootstrap/__tests__/utils/recording-application-factory.js';
import { RecordingHttpConfigurer } from '../../bootstrap/__tests__/utils/recording-http-configurer.js';
import { LambdaBootstrap } from '../lambda-bootstrap.js';

describe('LambdaBootstrap', () => {
  const definition = ServiceDefinitionBuilder.aDefinition('billing').build();
  const env = { SERVICE_NAME: 'billing' };
  let server: Server;
  let port: number;
  let steps: BootstrapStep[];
  let app: FakeNestApplication;
  let applications: RecordingApplicationFactory;

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

  beforeEach(() => {
    steps = [];
    app = new FakeNestApplication(steps, {
      address: () => ({ address: '127.0.0.1', port }),
    });
    applications = new RecordingApplicationFactory(app);
  });

  const schedulingModes = (): unknown[] =>
    new ModuleTree(applications.requests[0]?.module).valuesOf('mode');

  it('starts the service once for several invocations', async () => {
    const handler = LambdaBootstrap.http(definition, { env, applications });

    await handler(ApiGatewayEventBuilder.aRequest().build());
    await handler(ApiGatewayEventBuilder.aRequest().build());

    expect(applications.requests).toHaveLength(1);
  });

  it('forwards each event to the running service and answers its response', async () => {
    const handler = LambdaBootstrap.http(definition, { env, applications });

    const response = await handler(ApiGatewayEventBuilder.aRequest().build());

    expect(response).toMatchObject({ statusCode: 200, body: 'pong' });
  });

  it('forces loopback on port 0 and external scheduling, and keeps the caller options', async () => {
    const adapter = {} as AbstractHttpAdapter;

    await LambdaBootstrap.http(definition, {
      env,
      applications,
      http: {
        configurer: new RecordingHttpConfigurer(steps),
        adapter,
        port: 3000,
        host: '0.0.0.0',
      },
    })(ApiGatewayEventBuilder.aRequest().build());

    expect(app.listened).toEqual([{ port: 0, host: '127.0.0.1' }]);
    expect(applications.requests[0]?.adapter).toBe(adapter);
    expect(steps).toContain(BootstrapStep.Configure);
    expect(schedulingModes()).toContain(SchedulingMode.External);
    expect(schedulingModes()).not.toContain(SchedulingMode.InProcess);
  });

  it('keeps an explicit scheduling mode of the caller', async () => {
    await LambdaBootstrap.http(definition, {
      env,
      applications,
      schedulingMode: SchedulingMode.InProcess,
    })(ApiGatewayEventBuilder.aRequest().build());

    expect(schedulingModes()).toContain(SchedulingMode.InProcess);
    expect(schedulingModes()).not.toContain(SchedulingMode.External);
  });

  it('retries the start after a failed first invocation', async () => {
    applications.failNext(new Error('database unreachable'));
    const handler = LambdaBootstrap.http(definition, { env, applications });

    await expect(
      handler(ApiGatewayEventBuilder.aRequest().build()),
    ).rejects.toThrow('database unreachable');
    const response = await handler(ApiGatewayEventBuilder.aRequest().build());

    expect(applications.requests).toHaveLength(2);
    expect(response).toMatchObject({ statusCode: 200 });
  });
});
