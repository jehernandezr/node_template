import { SchedulingMode } from '@platform/scheduling';
import { ApiGatewayRequestMapper } from '../../lambda/api-gateway-request-mapper.js';
import { ApiGatewayResponseMapper } from '../../lambda/api-gateway-response-mapper.js';
import type { LambdaHttpHandler } from '../../lambda/lambda-http-handler.js';
import { LoopbackForwarder } from '../../lambda/loopback-forwarder.js';
import type { ServiceDefinition } from '../../service-definition.js';
import { ServiceBootstrap } from '../bootstrap/service-bootstrap.js';
import type { ServiceBootstrapOptions } from '../bootstrap/service-bootstrap-options.js';

/**
 * Startup of a service as a Lambda function. The service is the same HTTP process
 * as always, started only once on loopback per warm container;
 * each event is forwarded to it. No timers of its own, because Lambda
 * freezes the container between invocations.
 */
export class LambdaBootstrap {
  /**
   * Returns the function `handler`. The startup happens on the first
   * invocation and is retried if it fails.
   * @param definition Service definition.
   * @param options Bootstrap options.
   * @returns The Lambda handler.
   */
  static http(
    definition: ServiceDefinition,
    options: ServiceBootstrapOptions = {},
  ): LambdaHttpHandler {
    let starting: Promise<LoopbackForwarder> | undefined;
    const ensureStarted = (): Promise<LoopbackForwarder> => {
      starting ??= LambdaBootstrap.start(definition, options).catch(
        (error: unknown) => {
          starting = undefined;
          throw error;
        },
      );
      return starting;
    };
    return async (event) => (await ensureStarted()).forward(event);
  }

  private static async start(
    definition: ServiceDefinition,
    options: ServiceBootstrapOptions,
  ): Promise<LoopbackForwarder> {
    const running = await ServiceBootstrap.http(definition, {
      ...options,
      schedulingMode: options.schedulingMode ?? SchedulingMode.External,
      http: { ...options.http, port: 0, host: '127.0.0.1' },
    });
    const address = running.address;
    if (address === undefined) {
      await running.stop();
      throw new Error(
        `${definition.name} did not report the loopback address; the function cannot forward requests`,
      );
    }
    return new LoopbackForwarder(
      `http://${address.host}:${address.port}`,
      new ApiGatewayRequestMapper(),
      new ApiGatewayResponseMapper(),
      globalThis.fetch,
    );
  }
}
