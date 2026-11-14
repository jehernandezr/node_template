import { Redactor } from '../redaction/redactor.js';
import { Tracing } from './tracing.js';

/**
 * `Tracing` compartido para las funciones de compatibilidad del índice.
 * @deprecated Inyecta `Tracing`.
 */
export class SharedTracing {
  private static instance: Tracing | undefined;

  static get(): Tracing {
    SharedTracing.instance ??= new Tracing(new Redactor());
    return SharedTracing.instance;
  }
}
