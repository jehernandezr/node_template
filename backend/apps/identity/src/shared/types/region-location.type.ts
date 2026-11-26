/** The region of this identity deployment and its API URL, so the client calls the right region. */
export interface RegionLocation {
  readonly region: string;
  readonly apiBaseUrl?: string;
}
