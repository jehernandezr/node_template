/** Dialecto JSON Schema de todos los esquemas exportados. */
export const JSON_SCHEMA_DIALECT =
  'https://json-schema.org/draft/2020-12/schema';

/** Versión del formato de `contract.json`; el generador Dart la verifica. */
export const EXPORT_FORMAT_VERSION = 2;

/** Versión de AsyncAPI del documento generado. */
export const ASYNCAPI_VERSION = '3.0.0';

/** Versión del formato de `topology.json`. Terraform y LocalStack la leen. */
export const TOPOLOGY_FORMAT_VERSION = 1;

/** Ruta de `asyncapi.json`, relativa a `backend/`. Sus `$ref` apuntan a cada `contract.json`. */
export const ASYNCAPI_PATH = 'libs/contracts/asyncapi.json';

/** Ruta de `topology.json`, relativa a `backend/`. */
export const TOPOLOGY_PATH = 'infra/terraform/topology.json';

/** Carpeta con un subdirectorio por servicio, relativa a `backend/`. */
export const CONTRACTS_DIR = 'libs/contracts';

/** Subcarpeta de cada contrato donde se escribe `contract.json`. */
export const EXPORT_DIR = 'export';

/** Archivo que lee el generador Dart, dentro de `EXPORT_DIR`. */
export const CONTRACT_EXPORT_FILE = 'contract.json';

/** OpenAPI de las rutas de cada servicio, dentro de `EXPORT_DIR`. */
export const OPENAPI_EXPORT_FILE = 'openapi.json';

/** Versión de OpenAPI de los documentos generados. */
export const OPENAPI_VERSION = '3.1.0';

/** Subcomandos de la línea de comandos. */
export enum ExportCommandName {
  Export = 'export',
  Check = 'check',
  TopologyExport = 'topology-export',
  TopologyCheck = 'topology-check',
  OpenApi = 'openapi',
}

/** Qué artefactos genera un subcomando. */
export enum ExportScope {
  All = 'all',
  TopologyOnly = 'topology-only',
  OpenApiOnly = 'openapi-only',
}

/** Códigos de salida del proceso. */
export enum ExitCode {
  Success = 0,
  /** Los archivos generados no coinciden con los contratos o la exportación falló. */
  Failure = 1,
  /** El subcomando no existe. */
  Usage = 2,
}
