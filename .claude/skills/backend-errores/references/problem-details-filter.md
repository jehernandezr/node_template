# Problem Details filter: illustrative sketch

The platform defines the exact shape.

```ts
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  constructor(
    private readonly catalog: ErrorCatalogLookup,
    private readonly logger: LoggerPort,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<FastifyRequest>();
    const response = host.switchToHttp().getResponse<FastifyReply>();
    const entry = this.catalog.entryFor(exception);
    const problem = toProblemDetails({
      entry,
      title: entry.description,
      traceId: request.traceId,
      instance: request.url,
      typeBaseUrl: this.typeBaseUrl,
    });
    this.logger.error('request failed', {
      code: entry.code,
      traceId: request.traceId,
      cause: exception,
    });
    response
      .status(problem.status)
      .header('content-type', 'application/problem+json')
      .send(problem);
  }
}
```
