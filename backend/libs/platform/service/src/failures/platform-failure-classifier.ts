import { AwsErrorTranslator } from '@platform/adapters-aws';
import { ValkeyErrorTranslator } from '@platform/adapters-valkey';
import { PostgresFailureRule } from '@platform/persistence';
import { FailureClassifier } from '@platform/primitives';

/**
 * El clasificador de fallas de un servicio, con las reglas de los adaptadores que trae el runtime: un SQLSTATE pasajero
 * de Postgres, un error reintentable del SDK de AWS o una respuesta pasajera de Valkey se reintentan. Lo comparten el
 * servidor de la API interna, los consumidores y las sagas, así un failover de la base no termina en la cola de
 * errores ni compensa una saga.
 */
export class PlatformFailureClassifier extends FailureClassifier {
  constructor() {
    super([
      new PostgresFailureRule(),
      new AwsErrorTranslator(),
      new ValkeyErrorTranslator(),
    ]);
  }
}
