import { DatabaseAuth } from '../model/database-auth.enum.js';
import { databaseConfigSchema } from './database.config.js';

/**
 * The variables of `databaseConfigSchema` a deployment sets for each `DB_AUTH`. The contract export writes them to
 * `backend/infra/terraform/database-config.json`, and the `service-base` stack test requires its `DB_*` keys to be
 * exactly the IAM ones, so Terraform and the schema cannot drift apart.
 */
export class DatabaseConfigKeys {
  private static readonly UNUSED: Readonly<
    Record<DatabaseAuth, readonly string[]>
  > = {
    [DatabaseAuth.Password]: [],
    [DatabaseAuth.Iam]: ['DB_PASSWORD'],
  };

  /**
   * The schema keys a deployment with that authentication sets, sorted.
   * @param auth Value of `DB_AUTH`.
   * @returns The variable names.
   */
  static of(auth: DatabaseAuth): string[] {
    return Object.keys(databaseConfigSchema.shape)
      .filter((key) => !DatabaseConfigKeys.UNUSED[auth].includes(key))
      .sort();
  }
}
