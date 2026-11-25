import { InstrumentationNodeModuleDefinition } from '@opentelemetry/instrumentation';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';

/**
 * `ioredis` instrumentation applied to the `iovalkey` package. `iovalkey` is
 * a fork with a different package name: the official instrumentation only hooks
 * the `ioredis` module, so without this definition no Valkey command would
 * produce spans. The fork keeps `sendCommand` and `connect` on the
 * client prototype, which is what the instrumentation wraps.
 */
export class IovalkeyInstrumentation extends IORedisInstrumentation {
  /** Versions of `iovalkey` that share the internal structure of `ioredis`. */
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
