// Build and review cycle for one phase of the plan (docs/plan/README.md, waves 6 to 9).
// An Opus builder plans, implements and tests in a worktree; an independent Opus reviewer
// reviews the diff without editing it; the builder fixes. The builder commits and pushes
// to the troop/<key> branch as it goes; the reviewer does not. The general integrates, opens the PR and merges it.
//
// Args:
//   cycle: { key, title, path, area, plan, package, notes }
//     key      short name of the cycle (branch troop/<key>)
//     path     absolute worktree path, for example <repo>/.claude/worktrees/cycle-<key>
//     area     'backend' | 'front' | 'full' | 'docs': selects the verification
//     plan     governing design, relative to the worktree (docs/design/...)
//     package  which part of the design this cycle builds
//     notes    cycle-specific context (base, open findings, limits)
//   maxRounds    maximum number of reviews (default 2: review, fix and final review)
//   corrections  user findings or corrections that override everything else
//   shim         optional folder prepended to PATH (for example, a pinned pnpm)
//
// For an extra round of fixes on the same worktree: corrections with the pending
// findings and maxRounds 1 (fix and one review).

export const meta = {
  name: 'ciclo-fase',
  description:
    'Phase cycle: an Opus builds and tests, an independent Opus reviewer reviews, and the builder fixes until approved',
  phases: [
    {
      title: 'Build',
      detail: 'the Opus builder plans, implements and tests',
      model: 'opus',
    },
    {
      title: 'Review',
      detail: 'the independent Opus reviewer reviews the full diff',
      model: 'opus',
    },
    {
      title: 'Fix',
      detail: 'the builder fixes the findings',
      model: 'opus',
    },
  ],
};

const PATH_PREFIX = args.shim ? ` && export PATH="${args.shim}:$PATH"` : '';

const VERIFY = {
  backend: `- node .claude/skills/backend-estructura/scripts/check-structure.mjs --changed .
- pnpm nx run-many -t lint test typecheck --projects=<touched projects and their dependents> --skip-nx-cache (coverage 80/80/80/75 with --coverage on the touched projects)
- pnpm nx format:check
- If you touch contracts: pnpm nx run contracts-export:check and (cd front/packages/contracts && dart run contracts_gen --check)
- Docker: TESTCONTAINERS_RYUK_DISABLED=true`,
  front: `- node .claude/skills/front-estructura/scripts/check-structure.mjs --changed .
- pnpm nx run-many -t format-check analyze test --projects=<touched front projects and their dependents> --skip-nx-cache
- pnpm nx format:check
- If you touch pubspec: (cd front && flutter pub get)`,
  docs: `- pnpm nx format:check
- The .claude/skills scripts you touch have their tests with node --test and they pass
- node .claude/skills/backend-estructura/scripts/check-structure.mjs --all . and node .claude/skills/front-estructura/scripts/check-structure.mjs --all . run without execution errors`,
};

VERIFY.full = VERIFY.backend + '\n' + VERIFY.front;

const COMMON = (t) => `
Repository node_template. Your troop works ONLY in the worktree ${t.path} (branch troop/${t.key}). Every shell command starts with: cd ${t.path}${PATH_PREFIX}. If \`node -v\` gives 20, use Node 24: source ~/.nvm/nvm.sh && nvm use 24.
Never edit files outside ${t.path}. The repository hooks do not run in that worktree: run the checks yourself.

Your package: ${t.package} of the plan ${t.path}/${t.plan}. Read it in full together with the design decisions it cites (and the rules and waves sections of the plan). Respect its exclusive folders: touch nothing outside them except what the package declares.
${t.notes ?? ''}

Governing rules (read them in ${t.path}/.claude/skills and ${t.path}/CLAUDE.md): the ${t.area === 'front' ? 'front-*' : t.area === 'full' ? 'backend-* and front-*' : 'backend-*'} skills. Non-negotiable: classes, composition and constructor injection (no exported loose functions, except pure utilities and the exceptions the plan declares); tests in __tests__/ (backend) or in test/ (front) with utilities in __tests__/utils, test/utils or the test_utils package, never testing/support folders; code directly in src/ with no src/lib/; enums instead of literals; the code explains itself, with no inline comments; every public method has its complete and concise JSDoc (or /// in Dart), without mentioning WPs, waves, troops, audits or the plan. All developer text is in English only (docs, ADRs, plan, JSDoc, ///, commits), with no mixed languages and no em dashes; a Spanish doc or JSDoc you touch is translated entirely into English. User-facing text stays in its ARB.

Verification (all green before finishing):
${VERIFY[t.area]}
Commits (builder only; the reviewer never commits): make small commits on the troop/${t.key} branch each time a part compiles with its tests green, and after each commit run git -C ${t.path} push -u origin troop/${t.key}. Messages in Conventional Commits in English, lowercase subject, no Co-Authored-By and no AI attribution of any kind. Never use --no-verify or rewrite commits that were already pushed.

CPU AND MEMORY: the machine is a Raspberry Pi with 4 cores and 8 GB. One heavy command at a time: do not start tsc, lint or nx while Jest is running, and no background commands in parallel. Nx with --parallel=1; Jest with --maxWorkers=2 for unit tests and --runInBand for integration; integration tests one project at a time, never all at once. After each run, remove the test containers (docker rm -f $(docker ps -aq --filter label=org.testcontainers=true)), kill hung Jest processes and stop the Nx daemon of your worktree (pnpm nx daemon --stop). In fixtures, no credential-shaped literals next to keys such as token, key, secret or credential (gitleaks).`;

const REPORT_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    commitMessage: {
      type: 'string',
      description:
        'Conventional Commits in English, lowercase subject, lines of at most 100 characters, no Co-Authored-By and no AI attribution',
    },
    closedFindings: {
      type: 'string',
      description: 'Plan findings the package closed',
    },
    corrections: { type: 'string' },
    deviations: {
      type: 'string',
      description: 'Deviations from the plan and why',
    },
    verification: {
      type: 'string',
      description: 'Result of each verification command',
    },
    outsideChanges: {
      type: 'string',
      description: 'Changes needed outside the package folders',
    },
    allGreen: { type: 'boolean' },
  },
  required: [
    'summary',
    'commitMessage',
    'closedFindings',
    'corrections',
    'deviations',
    'verification',
    'outsideChanges',
    'allGreen',
  ],
};

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    approved: {
      type: 'boolean',
      description: 'true only if no blocking finding remains',
    },
    summary: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: {
            type: 'string',
            enum: ['blocker', 'important', 'minor'],
          },
          file: { type: 'string' },
          issue: { type: 'string' },
          fix: { type: 'string' },
        },
        required: ['severity', 'file', 'issue', 'fix'],
      },
    },
    verification: {
      type: 'string',
      description: 'Commands you ran and their result',
    },
  },
  required: ['approved', 'summary', 'findings', 'verification'],
};

const t = args.cycle;
const maxRounds = args.maxRounds ?? 2;
const corrections = args.corrections
  ? `\n\nUSER CORRECTIONS (they override everything else; apply all of them):\n${args.corrections}`
  : '';

phase('Build');
let report = await agent(
  `You are the BUILDER (Opus) of the cycle "${t.title}". You work alone: you plan, implement, test and verify everything yourself, without delegating to other agents.
${COMMON(t)}${corrections}

How you work (pstack method, repository rules; first read the pstack-en-node-template skill and its "How work is done" section):
1. Read the package and the decisions it cites, the skills and the current code. If the branch already has work from a previous run (git log main..HEAD and git status), start from there.
2. Choose the poteto-mode playbook that fits the package (feature, bug-fix, refactoring or perf-issue) and follow its steps. For non-trivial design, use architect before coding.
3. Build in verifiable units (principle-sequence-verifiable-units): first ports and interfaces, then implementations with tests, and the wiring last. Each unit ends compiling, with its tests green and with its commit and push. Each bug or finding starts with the test that reproduces it (tdd).
4. Before handing off, run no-comments on your diff and unslop on the ADRs and documentation you touched.
5. Follow principle-prove-it-works: run the full verification until green and finish with a last commit and push. Leave nothing uncommitted.
Return the report with the schema.`,
  {
    model: 'opus',
    phase: 'Build',
    label: `builder:${t.key}`,
    schema: REPORT_SCHEMA,
  },
);

const reviews = [];
for (let round = 1; round <= maxRounds; round++) {
  phase('Review');
  const review = await agent(
    `You are the REVIEWER (Opus) of the cycle "${t.title}". You are independent: you did not write this code and you do not fix it. Your job is to find what is wrong or missing.
${COMMON(t)}${corrections}

Builder report:
${JSON.stringify(report, null, 2)}

What you do (you follow the pstack interrogate skill; first read pstack-en-node-template and its "interrogate here" section):
1. Read the full diff of the branch against main (git -C ${t.path} log --oneline main..HEAD, git -C ${t.path} diff main...HEAD and status in case something was left uncommitted) against the plan package, the decisions it cites and the skills.
2. Look for: what the package asks for and is missing; logic and concurrency bugs; weak tests or tests that do not test what they claim; rule violations (loose functions, ports that are not abstract classes, literals where enums belong, infrastructure imports in domain, NestJS outside src/nest); missing alternatives from table 2.1 of the F5 to F11 design; secrets or credential-shaped literals in fixtures; inline comments, public methods without complete and concise JSDoc, or JSDoc that narrates the process.
3. Open the interrogate adversary panel with the models from the interrogate reviewers line of ~/.claude/rules/pstack-models.md, each one in its own worktree (isolation worktree), with the rules from point 2 and those from the "Review rules" of the area skills. Their runs are targeted (one test file or one script, never a full suite). Rerun each finding yourself and keep only those the run proves; the rest go to dropped in the summary. Also run no-comments in read-only mode and, if the change touches platform, contracts, authentication or data, blast-radius.
4. Run the full verification yourself to confirm it is green.
Do not edit files in the cycle worktree. approved is true only if no blocking finding remains. Return the review with the schema.`,
    {
      model: 'opus',
      phase: 'Review',
      label: `reviewer:${t.key}:${round}`,
      schema: REVIEW_SCHEMA,
    },
  );
  if (!review) {
    return {
      cycle: t.key,
      path: t.path,
      report,
      reviews,
      error: `reviewer ${round} returned no result`,
    };
  }
  reviews.push(review);
  if (review.approved || round === maxRounds) break;

  phase('Fix');
  report = await agent(
    `You are the BUILDER (Opus) of the cycle "${t.title}". The independent reviewer found this:
${COMMON(t)}${corrections}

Findings:
${JSON.stringify(review.findings, null, 2)}

Fix every blocker and important finding, and the minor ones that make sense. Each one starts with the test that reproduces it (tdd) and is fixed at its root (principle-fix-root-causes). If you disagree with a finding, explain it in deviations. Run the full verification until green and finish with a commit and push: leave nothing uncommitted. Return the report with the schema.`,
    {
      model: 'opus',
      phase: 'Fix',
      label: `fix:${t.key}:${round}`,
      schema: REPORT_SCHEMA,
    },
  );
}

return { cycle: t.key, path: t.path, report, reviews };
