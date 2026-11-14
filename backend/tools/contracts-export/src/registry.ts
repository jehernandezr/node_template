import { identityContract } from '@contracts/identity';
import { platformContract, type ServiceContract } from '@contracts/platform';

/**
 * Contratos que se exportan. Un servicio nuevo en `libs/contracts/<servicio>`
 * se agrega aquí; `check` falla si una carpeta no tiene contrato registrado.
 */
export const contracts: readonly ServiceContract[] = [
  platformContract,
  identityContract,
];
