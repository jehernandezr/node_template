import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { TimestampTransformer } from '../transformers/timestamp-transformer.js';

/**
 * Base de toda entidad: id UUIDv7 que genera la aplicación, versión para el bloqueo optimista,
 * fechas en `timestamptz` y borrado lógico.
 */
export abstract class VersionedEntity {
  @PrimaryColumn({ type: 'uuid', name: 'id' })
  id!: string;

  /** Sin valor mientras la entidad no se guarda; la base la inicia en 1 y la sube en cada actualización. */
  @VersionColumn({ name: 'version' })
  version?: number;

  @CreateDateColumn({
    type: 'timestamptz',
    name: 'created_at',
    transformer: new TimestampTransformer(),
  })
  createdAt?: Date;

  @UpdateDateColumn({
    type: 'timestamptz',
    name: 'updated_at',
    transformer: new TimestampTransformer(),
  })
  updatedAt?: Date;

  /** Con valor, la fila está borrada: las lecturas de TypeORM la ocultan. */
  @DeleteDateColumn({
    type: 'timestamptz',
    name: 'deleted_at',
    nullable: true,
    transformer: new TimestampTransformer(),
  })
  deletedAt?: Date | null;
}
