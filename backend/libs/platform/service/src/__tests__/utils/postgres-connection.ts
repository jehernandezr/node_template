/** Datos de conexión al servidor PostgreSQL de las pruebas de integración. */
export interface PostgresConnection {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
}
