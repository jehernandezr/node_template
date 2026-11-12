/**
 * Base de los objetos de valor. Dos instancias son iguales si son de la
 * misma clase y sus propiedades son estructuralmente iguales.
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>;

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<TProps> | null | undefined): boolean {
    if (other == null) return false;
    if (other === this) return true;
    if (other.constructor !== this.constructor) return false;
    return deepEqual(this.props, other.props);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (a instanceof ValueObject && b instanceof ValueObject) return a.equals(b);
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => deepEqual(item, b[i]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = Object.keys(a);
    return (
      keys.length === Object.keys(b).length &&
      keys.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
    );
  }
  return false;
}
