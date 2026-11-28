/** JSON Schema dialect of all exported schemas. */
export const JSON_SCHEMA_DIALECT =
  'https://json-schema.org/draft/2020-12/schema';

/** Format version of `contract.json`; the Dart generator checks it. */
export const EXPORT_FORMAT_VERSION = 2;

/** AsyncAPI version of the generated document. */
export const ASYNCAPI_VERSION = '3.0.0';

/** Format version of `topology.json`. Terraform and LocalStack read it. */
export const TOPOLOGY_FORMAT_VERSION = 1;

/** Path of `asyncapi.json`, relative to `backend/`. Its `$ref` entries point to each `contract.json`. */
export const ASYNCAPI_PATH = 'libs/contracts/asyncapi.json';

/** Format version of `database-config.json`. The `service-base` stack test reads it. */
export const DATABASE_CONFIG_FORMAT_VERSION = 1;

/** Path of `database-config.json`, relative to `backend/`. */
export const DATABASE_CONFIG_PATH = 'infra/terraform/database-config.json';

/** Path of `topology.json`, relative to `backend/`. */
export const TOPOLOGY_PATH = 'infra/terraform/topology.json';

/** Folder with one subdirectory per service, relative to `backend/`. */
export const CONTRACTS_DIR = 'libs/contracts';

/** Subfolder of each contract where `contract.json` is written. */
export const EXPORT_DIR = 'export';

/** File the Dart generator reads, inside `EXPORT_DIR`. */
export const CONTRACT_EXPORT_FILE = 'contract.json';

/** OpenAPI of each service's routes, inside `EXPORT_DIR`. */
export const OPENAPI_EXPORT_FILE = 'openapi.json';

/** OpenAPI version of the generated documents. */
export const OPENAPI_VERSION = '3.1.0';

/** Command line subcommands. */
export enum ExportCommandName {
  Export = 'export',
  Check = 'check',
  TopologyExport = 'topology-export',
  TopologyCheck = 'topology-check',
  OpenApi = 'openapi',
}

/** Which artifacts a subcommand generates. */
export enum ExportScope {
  All = 'all',
  TopologyOnly = 'topology-only',
  OpenApiOnly = 'openapi-only',
}

/** Process exit codes. */
export enum ExitCode {
  Success = 0,
  /** The generated files do not match the contracts or the export failed. */
  Failure = 1,
  /** The subcommand does not exist. */
  Usage = 2,
}
