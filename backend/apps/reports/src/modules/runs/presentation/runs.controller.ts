import { ActingMember } from '@platform/auth';
import type { Actor } from '@platform/auth';
import { CurrentActor, Endpoint, Input, Resource } from '@platform/http/nest';
import {
  CreateRunRoute,
  DownloadRunRoute,
  GetRunRoute,
  ListRunsRoute,
  type CreateReportRunRequest,
  type DownloadReportRunRequest,
  type GetReportRunRequest,
  type ListReportRunsRequest,
  type ReportDownload,
  type ReportRunCreated,
  type ReportRunDetail,
  type ReportRunPage,
} from '@contracts/reports';
import { ReportsResource } from '../../../shared/enums/reports-resource.enum.js';
import { CreateRun } from '../application/create-run.use-case.js';
import { RunQueries } from '../application/run-queries.js';

/** HTTP routes of the report runs of the actor's tenant. */
@Resource(ReportsResource.Runs)
export class RunsController {
  constructor(
    private readonly createRun: CreateRun,
    private readonly queries: RunQueries,
  ) {}

  /**
   * Queues a report run.
   * @param input Type, format and parameters.
   * @param actor Signed-in actor.
   * @returns The queued run.
   */
  @Endpoint(CreateRunRoute)
  create(
    @Input() input: CreateReportRunRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportRunCreated> {
    return this.createRun.execute(ActingMember.of(actor), input);
  }

  /**
   * Lists the runs of the actor's tenant.
   * @param input Cursor and page size.
   * @param actor Signed-in actor.
   * @returns One page of runs.
   */
  @Endpoint(ListRunsRoute)
  list(
    @Input() input: ListReportRunsRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportRunPage> {
    return this.queries.list(ActingMember.of(actor).tenantId, input);
  }

  /**
   * Reads one run.
   * @param input Run id.
   * @param actor Signed-in actor.
   * @returns The run detail.
   */
  @Endpoint(GetRunRoute)
  get(
    @Input() input: GetReportRunRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportRunDetail> {
    return this.queries.get(ActingMember.of(actor).tenantId, input.runId);
  }

  /**
   * Downloads the file of a ready run.
   * @param input Run id.
   * @param actor Signed-in actor.
   * @returns The file.
   */
  @Endpoint(DownloadRunRoute)
  download(
    @Input() input: DownloadReportRunRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportDownload> {
    return this.queries.download(ActingMember.of(actor).tenantId, input.runId);
  }
}
