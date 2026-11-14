/**
 * Recibe las fallas que el caché absorbe al caer en la carga directa. Un
 * servicio las conecta a sus métricas o a sus logs.
 */
export abstract class CacheErrorReporter {
  abstract report(error: unknown): void;
}
