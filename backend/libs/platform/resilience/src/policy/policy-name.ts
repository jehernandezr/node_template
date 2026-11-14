import { ResilienceGuard } from '../errors/resilience-guard.js';

/**
 * Nombre de una política de resiliencia. Un valor de objeto en lugar de un
 * enum cerrado: la librería trae `Cache` y `Database`, y cada servicio crea las
 * suyas con `PolicyName.of` sin editar la librería.
 */
export class PolicyName {
  /** Forma de un nombre: minúsculas, dígitos, punto, guion y guion bajo. */
  static readonly PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

  static readonly Cache = new PolicyName('cache');
  static readonly Database = new PolicyName('database');

  /** Política propia del servicio. Dos nombres con el mismo `value` son la misma política. */
  static of(value: string): PolicyName {
    return new PolicyName(
      ResilienceGuard.instance.matches('name', value, PolicyName.PATTERN),
    );
  }

  private constructor(readonly value: string) {}

  toString(): string {
    return this.value;
  }
}
