import type { AwsCredentialsProvider } from '@platform/adapters-aws';
import type { AppConfig } from '@platform/config';
import type { InternalRequestSigner } from '@platform/internal-api';

/** How an internal call reaches the owner of the operation. */
export enum ServiceInternalTransport {
  /** Straight to the router of the same process: local mode and test mode. */
  InProcess = 'in-process',
  /** Over signed HTTP to another process. */
  Http = 'http',
}

/** Data of the internal API HTTP transport; it comes from the validated configuration. */
export interface ServiceInternalHttpSettings {
  /** Base URL per service name. */
  readonly baseUrls: Readonly<Record<string, string>>;
  /** HMAC secret shared between services. */
  readonly secret: string;
  /** Outgoing signer; without a value, HMAC with `secret`. The service builds it according to `INTERNAL_API_SIGNER`. */
  readonly signer?: InternalRequestSigner;
  readonly signatureWindowMs?: number;
}

/** Credentials and region of the service role, used to sign with SigV4. */
export interface ServiceAwsIdentity {
  readonly credentials: AwsCredentialsProvider;
  readonly region: string;
}

/** What the runtime offers the service to build its HTTP transport. */
export interface ServiceInternalHttpContext {
  /** Only with the AWS adapter enabled. */
  readonly aws?: ServiceAwsIdentity;
}

/** How the service declares its internal API. */
export interface ServiceInternalApi {
  readonly transport: ServiceInternalTransport;
  /**
   * Required with `ServiceInternalTransport.Http`; it also authenticates incoming calls. The service
   * chooses its signer here according to `INTERNAL_API_SIGNER`.
   */
  readonly http?: (
    config: AppConfig,
    context: ServiceInternalHttpContext,
  ) => ServiceInternalHttpSettings;
}
