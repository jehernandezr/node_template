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

@Resource(ReportsResource.Runs)
export class RunsController {
  constructor(
    private readonly createRun: CreateRun,
    private readonly queries: RunQueries,
  ) {}

  @Endpoint(CreateRunRoute)
  create(
    @Input() input: CreateReportRunRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportRunCreated> {
    return this.createRun.execute(ActingMember.of(actor), input);
  }

  @Endpoint(ListRunsRoute)
  list(
    @Input() input: ListReportRunsRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportRunPage> {
    return this.queries.list(ActingMember.of(actor).tenantId, input);
  }

  @Endpoint(GetRunRoute)
  get(
    @Input() input: GetReportRunRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportRunDetail> {
    return this.queries.get(ActingMember.of(actor).tenantId, input.runId);
  }

  @Endpoint(DownloadRunRoute)
  download(
    @Input() input: DownloadReportRunRequest,
    @CurrentActor() actor: Actor | undefined,
  ): Promise<ReportDownload> {
    return this.queries.download(ActingMember.of(actor).tenantId, input.runId);
  }
}
