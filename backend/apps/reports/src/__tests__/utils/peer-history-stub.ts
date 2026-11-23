import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from 'node:http';
import type { AddressInfo } from 'node:net';
import {
  ListInvoiceChangesOperation,
  type InvoiceChange,
} from '@contracts/billing';
import { ListTaskChangesOperation, type TaskChange } from '@contracts/tasks';
import { InternalApiRoute } from '@platform/internal-api';
import { CallOutcome } from '@platform/primitives';

interface PageInput {
  readonly tenantId: string;
  readonly limit: number;
  readonly after?: string;
}

/**
 * Tasks y billing de mentira: responden `tasks.tasks.list-changes.v1` y `billing.invoices.list-changes.v1`
 * con la historia que la prueba les da por tenant, en páginas del tamaño pedido. Cuentan las páginas servidas
 * para ver cuándo el relleno deja de pedir.
 */
export class PeerHistoryStub {
  private readonly tasks = new Map<string, readonly TaskChange[]>();
  private readonly invoices = new Map<string, readonly InvoiceChange[]>();
  private readonly server: Server = createServer((request, response) => {
    this.answer(request, response).catch((error: unknown) => {
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end(String(error));
    });
  });
  pagesServed = 0;

  async start(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server.listen(0, '127.0.0.1', resolve),
    );
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }

  baseUrl(): string {
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  tasksOf(tenantId: string, changes: readonly TaskChange[]): void {
    this.tasks.set(tenantId, changes);
  }

  invoicesOf(tenantId: string, invoices: readonly InvoiceChange[]): void {
    this.invoices.set(tenantId, invoices);
  }

  private async answer(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      chunks.push(chunk as Buffer);
    }
    const { input } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
      input: PageInput;
    };
    response
      .writeHead(200, { 'content-type': 'application/json' })
      .end(JSON.stringify({ outcome: this.outcomeOf(request.url, input) }));
  }

  private outcomeOf(url: string | undefined, input: PageInput) {
    if (url === InternalApiRoute.pathOf(ListTaskChangesOperation.id)) {
      return CallOutcome.success(this.pageOf(this.tasks, input));
    }
    if (url === InternalApiRoute.pathOf(ListInvoiceChangesOperation.id)) {
      return CallOutcome.success(this.pageOf(this.invoices, input));
    }
    return CallOutcome.protocolViolation(`unknown ${url ?? ''}`);
  }

  private pageOf<T>(
    histories: ReadonlyMap<string, readonly T[]>,
    input: PageInput,
  ) {
    this.pagesServed += 1;
    const history = histories.get(input.tenantId) ?? [];
    const start = input.after === undefined ? 0 : Number(input.after);
    const end = start + input.limit;
    return {
      items: history.slice(start, end),
      nextCursor: end < history.length ? String(end) : null,
    };
  }
}
