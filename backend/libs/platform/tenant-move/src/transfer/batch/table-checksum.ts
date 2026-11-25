/** Count and checksum of the tenant rows in a table. */
export interface TableChecksum {
  readonly rows: number;
  readonly checksum: string;
}
