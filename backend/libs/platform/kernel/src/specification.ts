/**
 * Regla de negocio que un candidato cumple o no. Darle nombre a la regla
 * permite reutilizarla en el dominio y combinarla sin repetir condiciones.
 */
export abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  /** Se cumple cuando se cumplen esta regla y `other`. */
  and(other: Specification<T>): Specification<T> {
    return new AllOfSpecification([this, other]);
  }

  /** Se cumple cuando se cumple esta regla o `other`. */
  or(other: Specification<T>): Specification<T> {
    return new AnyOfSpecification([this, other]);
  }

  /** Se cumple cuando esta regla no se cumple. */
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AllOfSpecification<T> extends Specification<T> {
  constructor(private readonly parts: readonly Specification<T>[]) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.parts.every((part) => part.isSatisfiedBy(candidate));
  }
}

class AnyOfSpecification<T> extends Specification<T> {
  constructor(private readonly parts: readonly Specification<T>[]) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return this.parts.some((part) => part.isSatisfiedBy(candidate));
  }
}

class NotSpecification<T> extends Specification<T> {
  constructor(private readonly inner: Specification<T>) {
    super();
  }

  isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}
