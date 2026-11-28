import { SecretSource } from '../../ports/secret-source.js';
import type { SecretReference } from '../../secrets/secret-reference.js';

/** Secret store in memory: values by secret ARN, as plain text or as a JSON object with keys. */
export class InMemorySecretSource extends SecretSource {
  /** Every batch of references read, in order. */
  readonly reads: (readonly SecretReference[])[] = [];

  constructor(private readonly secrets: Readonly<Record<string, string>>) {
    super();
  }

  override read(
    references: readonly SecretReference[],
  ): Promise<ReadonlyMap<string, string>> {
    this.reads.push(references);
    const values = new Map<string, string>();
    for (const reference of references) {
      const text = this.secrets[reference.secretId];
      if (text === undefined) {
        return Promise.reject(new Error(`no secret for ${reference.variable}`));
      }
      values.set(
        reference.variable,
        reference.jsonKey === undefined
          ? text
          : String(
              (JSON.parse(text) as Record<string, unknown>)[reference.jsonKey],
            ),
      );
    }
    return Promise.resolve(values);
  }
}
