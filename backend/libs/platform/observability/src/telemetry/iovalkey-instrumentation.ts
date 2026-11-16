import { InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';

/**
 * Instrumentación de `ioredis` aplicada al paquete `iovalkey`. `iovalkey` es
 * un fork con otro nombre de paquete: la instrumentación oficial solo engancha
 * el módulo `ioredis`, así que sin esta definición ningún comando de Valkey
 * generaría spans. El fork conserva `sendCommand` y `connect` en el
 * prototipo del cliente, que es lo que la instrumentación envuelve.
 */
export class IovalkeyInstrumentation extends IORedisInstrumentation {
  /** Versiones de `iovalkey` que comparten la estructura interna de `ioredis`. */
  static readonly SUPPORTED_VERSIONS = ['>=0.1.0 <1'];

  override init(): InstrumentationNodeModuleDefinition[] {
    return super
      .init()
      .map(
        (definition) =>
          new InstrumentationNodeModuleDefinition(
            'iovalkey',
            IovalkeyInstrumentation.SUPPORTED_VERSIONS,
            definition.patch,
            definition.unpatch,
          ),
      );
  }
}
