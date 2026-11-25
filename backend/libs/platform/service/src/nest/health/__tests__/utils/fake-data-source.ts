import type { DataSource } from 'typeorm';

/** Test `DataSource`: keeps the queries it receives and responds empty or with the given error. */
export class FakeDataSource {
  readonly queries: string[] = [];

  constructor(private readonly failure?: Error) {}

  static failingWith(error: Error): FakeDataSource {
    return new FakeDataSource(error);
  }

  query(sql: string): Promise<unknown[]> {
    this.queries.push(sql);
    return this.failure === undefined
      ? Promise.resolve([])
      : Promise.reject(this.failure);
  }

  /** Exposes the fake with the `DataSource` shape that the real classes require. */
  asDataSource(): DataSource {
    return this as unknown as DataSource;
  }
}
