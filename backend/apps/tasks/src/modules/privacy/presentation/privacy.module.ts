import { Module } from '@nestjs/common';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';

/** Borrado de datos de usuario, cambios para proyecciones y, después, el traslado de tenants. */
@Module({ providers: [PrivacyInternalOperations] })
export class PrivacyModule {}
