/**
 * Business rule that a candidate either satisfies or not. Naming the rule
 * allows reusing it in the domain and combining it without repeating conditions.
 */
export abstract class Specification<T> {
  /**
   * Tells whether a candidate satisfies the rule.
   * @param candidate Value to check.
   * @returns `true` when satisfied.
   */
  abstract isSatisfiedBy(candidate: T): boolean;

  /**
   * Satisfied when both this rule and `other` are satisfied.
   * @param other Other rule.
   * @returns The combined rule.
   */
  and(other: Specification<T>): Specification<T> {
    return new AllOfSpecification([this, other]);
  }

  /**
   * Satisfied when this rule or `other` is satisfied.
   * @param other Other rule.
   * @returns The combined rule.
   */
  or(other: Specification<T>): Specification<T> {
    return new AnyOfSpecification([this, other]);
  }

  /**
   * Satisfied when this rule is not satisfied.
   * @returns The negated rule.
   */
  not(): Specification<T> {
    return new NotSpecification(this);
  }
}

class AllOfSpecification<T> extends Specification<T> {
  constructor(private readonly parts: readonly Specification<T>[]) {
    super();
  }

  override isSatisfiedBy(candidate: T): boolean {
    return this.parts.every((part) => part.isSatisfiedBy(candidate));
  }
}

class AnyOfSpecification<T> extends Specification<T> {
  constructor(private readonly parts: readonly Specification<T>[]) {
    super();
  }

  override isSatisfiedBy(candidate: T): boolean {
    return this.parts.some((part) => part.isSatisfiedBy(candidate));
  }
}

class NotSpecification<T> extends Specification<T> {
  constructor(private readonly inner: Specification<T>) {
    super();
  }

  override isSatisfiedBy(candidate: T): boolean {
    return !this.inner.isSatisfiedBy(candidate);
  }
}
