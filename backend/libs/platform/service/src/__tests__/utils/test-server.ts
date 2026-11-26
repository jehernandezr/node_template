/** A server a test app starts next to the service and stops after it, such as a stub of another service. */
export interface TestServer {
  start(): Promise<void>;
  stop(): Promise<void>;
}
