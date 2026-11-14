import { GuardViolationError } from '../errors/guard-violation.error.js';

/** Qué argumento falló y qué se esperaba de él. */
export interface GuardViolation {
  readonly name: string;
  readonly expectation: string;
}

/**
 * Construye el error de una violación. Recibe el mensaje ya redactado y, para
 * quien necesita separar argumento y expectativa, la violación.
 */
export type GuardFailure = (
  message: string,
  violation: GuardViolation,
) => Error;

/**
 * Validaciones de argumentos con el error como colaborador: cada librería
 * construye su guarda con su propio tipo de error y sus códigos. Cada método
 * devuelve el valor validado, así se valida en la misma asignación.
 */
export class Guard {
  /** Guarda que lanza `GuardViolationError`. */
  static readonly default = new Guard();

  constructor(
    private readonly fail: GuardFailure = (_message, violation) =>
      new GuardViolationError(violation.name, violation.expectation),
  ) {}

  positiveInteger(name: string, value: number): number {
    return this.require(
      Number.isInteger(value) && value > 0,
      name,
      value,
      'a positive integer',
    );
  }

  nonNegativeInteger(name: string, value: number): number {
    return this.require(
      Number.isInteger(value) && value >= 0,
      name,
      value,
      'an integer >= 0',
    );
  }

  nonNegativeFinite(name: string, value: number): number {
    return this.require(
      Number.isFinite(value) && value >= 0,
      name,
      value,
      'a finite number >= 0',
    );
  }

  integerInRange(
    name: string,
    value: number,
    min: number,
    max: number,
  ): number {
    return this.require(
      Number.isInteger(value) && value >= min && value <= max,
      name,
      value,
      `an integer between ${min} and ${max}`,
    );
  }

  nonEmpty(name: string, value: string): string {
    return this.require(
      typeof value === 'string' && value.length > 0,
      name,
      value,
      'a non-empty string',
    );
  }

  matches(name: string, value: string, pattern: RegExp): string {
    return this.require(
      typeof value === 'string' && pattern.test(value),
      name,
      value,
      `a string matching ${pattern.source}`,
    );
  }

  private require<T>(
    holds: boolean,
    name: string,
    value: T,
    expectation: string,
  ): T {
    if (!holds) {
      throw this.fail(`${name} must be ${expectation}`, { name, expectation });
    }
    return value;
  }
}
