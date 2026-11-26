import type { MigrationStatement } from './model/migration-statement.js';

/**
 * Writes the TypeScript code of a TypeORM migration with `up` and `down`. It is separate from
 * `MigrationGenerator` so the generated text can be tested without a database.
 */
export class MigrationSourceRenderer {
  /**
   * Renders the TypeScript source of a migration class.
   * @param className name of the class and of the migration, for example `CreateUsers1794700000001`.
   * @param up `up` statements in order. @param down `down` statements in the order they must run.
   * @param up Statements of `up`.
   * @param down Statements of `down`.
   * @returns The source text.
   */
  render(
    className: string,
    up: readonly MigrationStatement[],
    down: readonly MigrationStatement[],
  ): string {
    const lines = [
      "import type { MigrationInterface, QueryRunner } from 'typeorm';",
      '',
      `export class ${className} implements MigrationInterface {`,
      `  readonly name = '${className}';`,
      '',
      '  async up(queryRunner: QueryRunner): Promise<void> {',
      ...up.map((statement) => this.line(statement)),
      '  }',
      '',
      '  async down(queryRunner: QueryRunner): Promise<void> {',
      ...down.map((statement) => this.line(statement)),
      '  }',
      '}',
      '',
    ];
    return lines.join('\n');
  }

  private line(statement: MigrationStatement): string {
    const sql = this.escape(statement.query);
    if (
      statement.parameters === undefined ||
      statement.parameters.length === 0
    ) {
      return `    await queryRunner.query(\`${sql}\`);`;
    }
    return `    await queryRunner.query(\`${sql}\`, ${JSON.stringify(statement.parameters)});`;
  }

  /** Escapes what a template literal would interpret: the backslash, the backtick and interpolation. */
  private escape(sql: string): string {
    return sql
      .replace(/\\/g, () => '\\\\')
      .replace(/`/g, () => '\\`')
      .replace(/\$\{/g, () => '\\${');
  }
}
