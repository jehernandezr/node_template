import type { RecordMapper } from '../../src/lib/repository/base-repository.js';
import type { TableDefinition } from '../../src/lib/repository/table-definition.js';

/** Agregado de ejemplo para las pruebas del repositorio. */
export interface Task {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly priority: number;
  readonly secret?: string;
  /** 0 mientras no se guarda. */
  readonly version: number;
  readonly createdBy?: string | null;
  readonly updatedBy?: string | null;
  readonly deletedAt?: Date | null;
}

/** Registro ORM del agregado. */
export interface TaskRecord {
  id: string;
  tenantId?: string;
  title: string;
  status: string;
  priority: number;
  secret: string | null;
  version: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  deletedAt?: Date | null;
}

export const TASKS_TABLE: TableDefinition<TaskRecord> = {
  name: 'tasks',
  columns: {
    id: 'id',
    tenantId: 'tenant_id',
    title: 'title',
    status: 'status',
    priority: 'priority',
    secret: 'secret',
    version: 'version',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    createdBy: 'created_by',
    updatedBy: 'updated_by',
    deletedAt: 'deleted_at',
  },
  id: 'id',
  version: 'version',
  tenant: 'tenantId',
  softDelete: 'deletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy',
  updatedBy: 'updatedBy',
};

export const TASKS_DDL = `CREATE TABLE tasks (
  id text PRIMARY KEY,
  tenant_id text NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  priority integer NOT NULL,
  secret text,
  version integer NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  created_by text,
  updated_by text,
  deleted_at timestamptz
)`;

export const TASK_MAPPER: RecordMapper<Task, TaskRecord> = {
  toDomain: (record) => ({
    id: record.id,
    title: record.title,
    status: record.status,
    priority: Number(record.priority),
    secret: record.secret ?? undefined,
    version: Number(record.version),
    createdBy: record.createdBy ?? null,
    updatedBy: record.updatedBy ?? null,
    deletedAt: record.deletedAt ?? null,
  }),
  toRecord: (task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    secret: task.secret ?? null,
    version: task.version,
  }),
};

/** UUIDv7 de prueba con un contador al final. */
export function taskId(n: number): string {
  return `0193f1c2-0000-7000-8000-${n.toString(16).padStart(12, '0')}`;
}

export function newTask(n: number, overrides: Partial<Task> = {}): Task {
  return {
    id: taskId(n),
    title: `task ${n}`,
    status: 'open',
    priority: n,
    version: 0,
    ...overrides,
  };
}
