import { matchesGlob } from 'node:path';

/**
 * Paths that a changed path drags along although nothing imports them: generated code, generated localizations,
 * and the files that read a shared JSON or name a workflow.
 */
export class CoupledPaths {
  static RULES = [
    {
      when: 'backend/libs/contracts/**',
      coupled: 'front/packages/contracts/lib/**',
      reason:
        'generated Dart of the contracts: run contracts_gen --check and the contracts-export check',
    },
    {
      when: 'front/**/*.arb',
      coupled: 'front/packages/i18n/lib/**',
      reason: 'generated localizations: run flutter gen-l10n',
    },
    {
      when: '**/topology.json',
      coupled: 'topology.json readers',
      reason:
        'Terraform stacks, workflows and code that read the topology: search its keys',
    },
    {
      when: 'backend/infra/terraform/**/variables.tf',
      coupled: 'tfvars and module calls',
      reason:
        'every environment tfvars, module call and workflow that sets the variable',
    },
    {
      when: 'backend/infra/terraform/**/outputs.tf',
      coupled: 'remote state readers',
      reason: 'stacks that read the output through remote state, and workflows',
    },
    {
      when: '.github/workflows/**',
      coupled: 'ci-ok and branch protection',
      reason: 'the jobs ci-ok requires and the workflows that call this one',
    },
  ];

  /**
   * The couplings of a set of changed paths.
   * @param {string[]} changed Changed paths, from the root.
   * @returns {{ when: string, coupled: string, reason: string, files: string[] }[]} Each rule that applies, with the
   *   changed files that trigger it.
   */
  of(changed) {
    return CoupledPaths.RULES.map((rule) => ({
      ...rule,
      files: changed.filter((file) => matchesGlob(file, rule.when)),
    })).filter((rule) => rule.files.length > 0);
  }
}
