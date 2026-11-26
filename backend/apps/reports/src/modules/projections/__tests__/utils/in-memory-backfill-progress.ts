import type { ShardScope } from '@platform/persistence';
import {
  BackfillProgress,
  type Backfill,
  type BackfillSource,
} from '../../domain/backfill-progress.js';
import { ReportTenants } from '../../domain/report-tenants.js';

/** In-memory `BackfillProgress` of the tenant in scope, one cursor per source. */
export class InMemoryBackfillProgress extends BackfillProgress {
  private readonly saved = new Map<string, Backfill>();

  constructor(private readonly scope: ShardScope) {
    super();
  }

  override async find(source: BackfillSource): Promise<Backfill> {
    return this.saved.get(this.keyOf(source)) ?? { completed: false };
  }

  override async save(
    source: BackfillSource,
    backfill: Backfill,
  ): Promise<void> {
    this.saved.set(this.keyOf(source), backfill);
  }

  private keyOf(source: BackfillSource): string {
    return `${this.scope.current()?.tenantId ?? ''}:${source}`;
  }
}

/** `ReportTenants` that lists the tenants the test sets. */
export class ListedTenants extends ReportTenants {
  constructor(private readonly tenants: readonly string[]) {
    super();
  }

  override async active(): Promise<readonly string[]> {
    return this.tenants;
  }
}
