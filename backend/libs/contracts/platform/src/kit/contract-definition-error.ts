/**
 * Error al declarar un contrato: ruta, operación, evento o catálogo mal formados.
 * Se lanza al cargar el módulo del contrato, nunca en tiempo de petición.
 */
export class ContractDefinitionError extends Error {
  override readonly name = 'ContractDefinitionError';
}
