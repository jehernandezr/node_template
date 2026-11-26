/**
 * Transforms the input and output of a route between an earlier API version and the current one. While there is only
 * one version there are no transformers: the class is ready for the first one that changes a contract.
 */
export abstract class VersionTransformer {
  /** Earlier version this transformer knows how to translate. */
  abstract readonly fromVersion: string;

  /**
   * Adapts a request of an older version to the current shape.
   * @param routeId Route id.
   * @param input Request input.
   * @returns The adapted input.
   */
  abstract transformRequest(routeId: string, input: unknown): unknown;

  /**
   * Adapts a response to the shape of an older version.
   * @param routeId Route id.
   * @param output Response body.
   * @returns The adapted body.
   */
  abstract transformResponse(routeId: string, output: unknown): unknown;
}
