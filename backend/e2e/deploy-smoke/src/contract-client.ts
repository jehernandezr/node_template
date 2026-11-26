import type { RouteDefinition, RouteRequestSchema } from '@contracts/platform';
import { HttpMethod } from '@contracts/platform';
import { HttpHeader, HttpLimits } from '@platform/http';
import type { z } from 'zod';

/** What a route answers: its parsed response, or nothing when it has no body. */
export type RouteOutput<Res> = Res extends z.ZodType
  ? z.output<Res>
  : undefined;

/**
 * Calls the public API as the native app does: it validates each request against the route of the contract before
 * sending it, requires the route's success status and parses the response with its schema.
 */
export class ContractClient {
  /**
   * @param baseUrl Public base URL of the environment.
   * @param fetcher The `fetch` to send with.
   */
  constructor(
    private readonly baseUrl: URL,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  /**
   * Sends one request of the contract and returns its validated answer.
   * @param route Route definition.
   * @param input Request fields: path parameters, query or body.
   * @param accessToken Access token of a session, for routes that need one.
   * @returns The parsed response.
   * @throws Error with the method, path, status and response text when the status is not the route's success one.
   */
  async call<Req extends RouteRequestSchema, Res extends z.ZodType | null>(
    route: RouteDefinition<Req, Res>,
    input: z.input<Req>,
    accessToken?: string,
  ): Promise<RouteOutput<Res>> {
    const fields = {
      ...(route.request.parse(input) as Record<string, unknown>),
    };
    let path = route.path;
    for (const name of route.pathParams) {
      path = path.replace(
        `{${name}}`,
        encodeURIComponent(String(fields[name])),
      );
      delete fields[name];
    }
    const url = this.url(path);
    const inQuery =
      route.method === HttpMethod.Get || route.method === HttpMethod.Delete;
    if (inQuery) {
      for (const [name, value] of Object.entries(fields)) {
        if (value !== undefined) url.searchParams.set(name, String(value));
      }
    }
    const response = await this.fetcher(url, {
      method: route.method,
      headers: {
        [HttpHeader.SessionTransport]: HttpLimits.SESSION_TRANSPORT_BEARER,
        ...(inQuery ? {} : { [HttpHeader.ContentType]: 'application/json' }),
        ...(accessToken === undefined
          ? {}
          : { [HttpHeader.Authorization]: `Bearer ${accessToken}` }),
      },
      ...(inQuery ? {} : { body: JSON.stringify(fields) }),
    });
    const text = await response.text();
    if (response.status !== route.successStatus) {
      throw new Error(
        `${route.method} ${route.path} answered ${response.status}: ${text}`,
      );
    }
    return (
      route.response === null
        ? undefined
        : route.response.parse(JSON.parse(text))
    ) as RouteOutput<Res>;
  }

  /**
   * The URL of an API path, kept under any path prefix the base URL has.
   * @param path Absolute API path, such as `/v1/tasks`.
   * @returns The URL.
   */
  url(path: string): URL {
    const base = new URL(this.baseUrl);
    if (!base.pathname.endsWith('/')) base.pathname = `${base.pathname}/`;
    return new URL(path.replace(/^\//, ''), base);
  }
}
