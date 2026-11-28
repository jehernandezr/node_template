/** Who a new connection authenticates as, and where. An IAM token is only valid for this host, port and user. */
export interface DatabaseTokenRequest {
  readonly host: string;
  readonly port: number;
  readonly user: string;
}
