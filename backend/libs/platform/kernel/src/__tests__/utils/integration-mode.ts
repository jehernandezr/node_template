/** What integration tests do when there is no container runtime. */
export enum IntegrationMode {
  /** They are skipped without reporting a failure. */
  Skip = 'skip',
  /** They fail: an environment without containers cannot accept the run as good. */
  Require = 'require',
}
