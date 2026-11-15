import type { MigrationStatement } from './model/migration-statement.js';

/**
 * Escribe el código TypeScript de una migración de TypeORM con `up` y `down`. Está separado de
 * `MigrationGenerator` para probar el texto generado sin una base de datos.
 */
export class MigrationSourceRenderer {
  /**
   * @param className nombre de la clase y de la migración, por ejemplo `CreateUsers1794700000001`.
   * @param up sentencias de `up` en orden. @param down sentencias de `down` en el orden en que deben correr.
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

  /** Escapa lo que un template literal interpretaría: la barra invertida, el backtick y la interpolación. */
  private escape(sql: string): string {
    return sql
      .replace(/\\/g, () => '\\\\')
      .replace(/`/g, () => '\\`')
      .replace(/\$\{/g, () => '\\${');
  }
}
