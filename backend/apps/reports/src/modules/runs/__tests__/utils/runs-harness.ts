import {
  ConfigLoader,
  ConfigRegistry,
  RegistryAppConfig,
} from '@platform/config';
import { ActingMember } from '@platform/auth';
import { TestActors } from '@platform/auth/test-utils';
import { FixedClock, SequentialIdGenerator } from '@platform/kernel/test-utils';
import {
  InMemoryTransactionManager,
  RecordingMessageBus,
} from '@platform/messaging/test-utils';
import { UnroutedShardScopes } from '@platform/persistence/test-utils';
import { ReportsSettings } from '../../../../config/reports-settings.js';
import { CreateRun } from '../../application/create-run.use-case.js';
import { ExecuteRun } from '../../application/execute-run.use-case.js';
import { ReportEntitlements } from '../../domain/report-entitlements.js';
import { FixedDefinitions } from './fixed-definitions.js';
import { InMemoryResults } from './in-memory-results.js';
import { InMemoryRuns } from './in-memory-runs.js';

/** Entitlements whose answer the test sets. */
export class SwitchableEntitlements extends ReportEntitlements {
  advanced = true;

  override async allowsAdvancedReports(): Promise<boolean> {
    return this.advanced;
  }
}

/** The run use cases of one tenant over doubles. */
export class RunsHarness {
  static readonly TENANT = '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a01';
  static readonly MAX_RESULT_BYTES = 2_048;

  readonly clock = new FixedClock(new Date('2026-11-20T10:00:00.000Z'));
  readonly runs = new InMemoryRuns();
  readonly results = new InMemoryResults();
  readonly definitions = new FixedDefinitions();
  readonly entitlements = new SwitchableEntitlements();
  readonly transactions = new InMemoryTransactionManager();
  readonly bus = new RecordingMessageBus(this.transactions);
  readonly member = ActingMember.of(TestActors.user(RunsHarness.TENANT));
  private readonly shard = UnroutedShardScopes.create();
  private readonly settings: ReportsSettings;

  constructor() {
    const registry = new ConfigRegistry();
    registry.setRoot({
      REPORTS_MAX_RESULT_BYTES: RunsHarness.MAX_RESULT_BYTES,
      REPORTS_RESULT_TTL_DAYS: 7,
    });
    this.settings = new ReportsSettings(
      new RegistryAppConfig(new ConfigLoader({}), registry),
    );
  }

  /** The use case that queues a run. */
  create(): CreateRun {
    return new CreateRun(
      this.runs,
      this.definitions,
      this.entitlements,
      this.bus,
      this.shard,
      this.transactions,
      new SequentialIdGenerator(),
      this.clock,
    );
  }

  /** The use case that computes a queued run. */
  execute(): ExecuteRun {
    return new ExecuteRun(
      this.runs,
      this.results,
      this.definitions,
      this.bus,
      this.shard,
      this.transactions,
      this.clock,
      this.settings,
    );
  }
}
