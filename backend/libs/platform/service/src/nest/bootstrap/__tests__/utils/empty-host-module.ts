import { Module } from '@nestjs/common';

/** Módulo sin providers para arrancar aplicaciones de prueba sin el runtime real. */
@Module({})
export class EmptyHostModule {}
