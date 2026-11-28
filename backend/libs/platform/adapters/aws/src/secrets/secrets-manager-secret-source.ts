import {
  BatchGetSecretValueCommand,
  type SecretValueEntry,
  type SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { SecretSource, type SecretReference } from '@platform/config';

/**
 * Reads secrets from AWS Secrets Manager with `BatchGetSecretValue`, twenty secrets per call, each one once even when
 * several variables read keys of it. Error messages name the variables, never a value.
 */
export class SecretsManagerSecretSource extends SecretSource {
  private static readonly BATCH_SIZE = 20;

  constructor(private readonly client: SecretsManagerClient) {
    super();
  }

  override async read(
    references: readonly SecretReference[],
  ): Promise<ReadonlyMap<string, string>> {
    const texts = await this.texts([
      ...new Set(references.map((reference) => reference.secretId)),
    ]);
    const values = new Map<string, string>();
    const missing: string[] = [];
    for (const reference of references) {
      const value = this.referencedValue(
        reference,
        texts.get(reference.secretId),
      );
      if (value === undefined) {
        missing.push(reference.variable);
      } else {
        values.set(reference.variable, value);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `Secrets Manager has no current value for ${missing.join(', ')}`,
      );
    }
    return values;
  }

  private async texts(
    secretIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    const texts = new Map<string, string>();
    for (
      let start = 0;
      start < secretIds.length;
      start += SecretsManagerSecretSource.BATCH_SIZE
    ) {
      const batch = secretIds.slice(
        start,
        start + SecretsManagerSecretSource.BATCH_SIZE,
      );
      const output = await this.client.send(
        new BatchGetSecretValueCommand({ SecretIdList: batch }),
      );
      for (const entry of output.SecretValues ?? []) {
        const secretId = this.requestedId(batch, entry);
        if (secretId !== undefined && entry.SecretString !== undefined) {
          texts.set(secretId, entry.SecretString);
        }
      }
    }
    return texts;
  }

  private requestedId(
    batch: readonly string[],
    entry: SecretValueEntry,
  ): string | undefined {
    return batch.find((id) => id === entry.ARN || id === entry.Name);
  }

  private referencedValue(
    reference: SecretReference,
    text: string | undefined,
  ): string | undefined {
    if (text === undefined || reference.jsonKey === undefined) {
      return text;
    }
    const value = this.fieldsOf(text)[reference.jsonKey];
    if (typeof value === 'string') {
      return value;
    }
    return value === undefined || value === null
      ? undefined
      : JSON.stringify(value);
  }

  private fieldsOf(text: string): Readonly<Record<string, unknown>> {
    try {
      const parsed: unknown = JSON.parse(text);
      return typeof parsed === 'object' && parsed !== null
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
}
