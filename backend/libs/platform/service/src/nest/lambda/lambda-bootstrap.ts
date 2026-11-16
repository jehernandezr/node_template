import { SchedulingMode } from '@platform/scheduling';
import { ApiGatewayRequestMapper } from '../../lambda/api-gateway-request-mapper.js';
import { ApiGatewayResponseMapper } from '../../lambda/api-gateway-response-mapper.js';
import type { LambdaHttpHandler } from '../../lambda/lambda-http-handler.js';
import { LoopbackForwarder } from '../../lambda/loopback-forwarder.js';
import type { ServiceDefinition } from '../../service-definition.js';
import { ServiceBootstrap } from '../bootstrap/service-bootstrap.js';
import type { ServiceBootstrapOptions } from '../bootstrap/service-bootstrap-options.js';

/**
 * Arranque de un servicio como función Lambda. El servicio es el mismo proceso
 * HTTP de siempre, levantado una sola vez en loopback por contenedor caliente;
 * cada evento se reenvía a él. Sin temporizadores propios, porque Lambda
 * congela el contenedor entre invocaciones.
 */
export class LambdaBootstrap {
  /**
   * Devuelve el `handler` de la función. El arranque se hace en la primera
   * invocación y se reintenta si falla.
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
        `${definition.name} no reportó la dirección de loopback; la función no puede reenviar las peticiones`,
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
