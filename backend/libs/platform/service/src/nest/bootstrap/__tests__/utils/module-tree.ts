/** Walks a Nest dynamic module description, without instantiating it, to find what it carries. */
export class ModuleTree {
  constructor(private readonly root: unknown) {}

  /**
   * Tells whether a value appears anywhere in the description: imports, providers and their options.
   * @param value Object to look for, compared by identity.
   * @returns `true` when found.
   */
  reaches(value: unknown): boolean {
    return this.nodes().includes(value);
  }

  /**
   * Collects every value stored under a property name anywhere in the description.
   * @param key Property name, such as `mode`.
   * @returns The values found, in no particular order.
   */
  valuesOf(key: string): unknown[] {
    return this.nodes()
      .filter(
        (node): node is Record<string, unknown> =>
          typeof node === 'object' && node !== null && key in node,
      )
      .map((node) => node[key]);
  }

  private nodes(): unknown[] {
    const seen = new Set<unknown>();
    const pending: unknown[] = [this.root];
    const visited: unknown[] = [];
    while (pending.length > 0) {
      const node = pending.pop();
      visited.push(node);
      if (typeof node !== 'object' || node === null || seen.has(node)) {
        continue;
      }
      seen.add(node);
      pending.push(...Object.values(node));
    }
    return visited;
  }
}
