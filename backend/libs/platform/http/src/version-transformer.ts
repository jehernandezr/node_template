/**
 * Transforms the input and output of a route between an earlier API version and the current one. While there is only
 * one version there are no transformers: the class is ready for the first one that changes a contract.
 */
export abstract class VersionTransformer {
  /** Earlier version this transformer knows how to translate. */
  abstract readonly fromVersion: string;

  abstract transformRequest(routeId: string, input: unknown): unknown;

  abstract transformResponse(routeId: string, output: unknown): unknown;
}
