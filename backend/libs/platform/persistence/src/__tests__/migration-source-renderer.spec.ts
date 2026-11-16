import { MigrationSourceRenderer } from '../migration-source-renderer.js';

const HEADER = [
  "import type { MigrationInterface, QueryRunner } from 'typeorm';",
  '',
  'export class CreateUsers1794700000001 implements MigrationInterface {',
  "  readonly name = 'CreateUsers1794700000001';",
  '',
  '  async up(queryRunner: QueryRunner): Promise<void> {',
];

describe('MigrationSourceRenderer', () => {
  const renderer = new MigrationSourceRenderer();

  describe('when a statement has no parameters', () => {
    it('renders it as a plain template literal call', () => {
      const source = renderer.render(
        'CreateUsers1794700000001',
        [{ query: 'CREATE TABLE "users" ()' }],
        [{ query: 'DROP TABLE "users"' }],
      );

      expect(source).toBe(
        [
          ...HEADER,
          '    await queryRunner.query(`CREATE TABLE "users" ()`);',
          '  }',
          '',
          '  async down(queryRunner: QueryRunner): Promise<void> {',
          '    await queryRunner.query(`DROP TABLE "users"`);',
          '  }',
          '}',
          '',
        ].join('\n'),
      );
    });
  });

  describe('when a statement has parameters', () => {
    it('renders them as JSON after the template literal', () => {
      const source = renderer.render(
        'CreateUsers1794700000001',
        [{ query: 'SELECT $1', parameters: ['tenant', 3] }],
        [],
      );

      expect(source).toContain(
        '    await queryRunner.query(`SELECT $1`, ["tenant",3]);',
      );
    });
  });

  describe('when the SQL contains a backtick, a backslash or an interpolation', () => {
    it('escapes them for the template literal', () => {
      const sql = 'A`B\\C${D}';

      const source = renderer.render(
        'CreateUsers1794700000001',
        [{ query: sql }],
        [],
      );

      expect(source).toContain(
        '    await queryRunner.query(`A' +
          '\\`' +
          'B' +
          '\\\\' +
          'C' +
          '\\${' +
          'D}`);',
      );
    });
  });

  describe('when there are several down statements', () => {
    it('keeps them in the order given', () => {
      const source = renderer.render(
        'CreateUsers1794700000001',
        [],
        [{ query: 'FIRST' }, { query: 'SECOND' }],
      );

      expect(source.indexOf('`FIRST`')).toBeLessThan(
        source.indexOf('`SECOND`'),
      );
    });
  });
});
