import { z } from 'zod';
import { ConfigValidationError } from '../errors/config-validation.error.js';
import type { SecretReference } from './secret-reference.js';

/**
 * The `SECRETS_MAP` variable: a JSON object from variable name to the secret that holds its value. Each value is a
 * Secrets Manager ARN with an optional JSON key, written as in the `valueFrom` of an ECS task definition
 * (`<arn>`, `<arn>:<key>` or `<arn>:<key>::`). A version stage or version id is not accepted: the value is always
 * the current one.
 */
export class SecretsMap {
  /** Name of the variable that holds the map. */
  static readonly VARIABLE = 'SECRETS_MAP';

  private static readonly VALUE_FROM =
    /^(?<arn>arn:[a-z-]+:secretsmanager:[a-z0-9-]+:\d{12}:secret:[^:]+)(?::(?<jsonKey>[^:]*)(?:::)?)?$/;

  private static readonly SCHEMA = z.record(
    z.string().regex(/^[A-Z][A-Z0-9_]*$/, 'expected a variable name'),
    z.string().regex(SecretsMap.VALUE_FROM, 'expected a Secrets Manager ARN'),
  );

  private constructor(readonly references: readonly SecretReference[]) {}

  /**
   * Parses the text of `SECRETS_MAP`.
   * @param raw The variable as the process received it.
   * @returns The references, one per variable.
   * @throws ConfigValidationError (`PLATFORM.CONFIG.INVALID`) if the text is not a JSON object of variable names to
   *   ARNs.
   */
  static parse(raw: string): SecretsMap {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      throw new ConfigValidationError([
        {
          path: SecretsMap.VARIABLE,
          code: 'invalid_json',
          message: 'expected a JSON object',
        },
      ]);
    }
    const parsed = SecretsMap.SCHEMA.safeParse(json);
    if (!parsed.success) {
      throw new ConfigValidationError(
        parsed.error.issues.map((issue) => ({
          path: [SecretsMap.VARIABLE, ...issue.path.map(String)].join('.'),
          code: issue.code,
          message: issue.message,
        })),
      );
    }
    return new SecretsMap(
      Object.entries(parsed.data).map(([variable, valueFrom]) =>
        SecretsMap.reference(variable, valueFrom),
      ),
    );
  }

  private static reference(
    variable: string,
    valueFrom: string,
  ): SecretReference {
    const groups = SecretsMap.VALUE_FROM.exec(valueFrom)?.groups ?? {};
    const secretId = groups['arn'] ?? valueFrom;
    const jsonKey = groups['jsonKey'];
    return jsonKey === undefined || jsonKey === ''
      ? { variable, secretId }
      : { variable, secretId, jsonKey };
  }
}
