import type { DataSource } from 'typeorm';

/** `DataSource` de prueba: guarda las consultas que recibe y responde vacío o con el error indicado. */
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

  /** Expone el fake con la forma de `DataSource` que piden las clases reales. */
  asDataSource(): DataSource {
    return this as unknown as DataSource;
  }
}
