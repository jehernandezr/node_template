/** Caso de uso de la aplicación: una operación con entrada y salida. */
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
