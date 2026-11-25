/**
 * Business rule that a candidate either satisfies or not. Naming the rule
 * allows reusing it in the domain and combining it without repeating conditions.
 */
export abstract class Specification<T> {
  abstract isSatisfiedBy(candidate: T): boolean;

  /** Satisfied when both this rule and `other` are satisfied. */
  and(other: Specification<T>): Specification<T> {
    return new AllOfSpecification([this, other]);
  }

  /** Satisfied when this rule or `other` is satisfied. */
  or(other: Specification<T>): Specification<T> {
    return new AnyOfSpecification([this, other]);
  }

  /** Satisfied when this rule is not satisfied. */
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
