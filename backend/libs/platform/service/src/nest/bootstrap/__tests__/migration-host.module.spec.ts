import { RdsIamDatabaseTokenProvider } from '@platform/adapters-aws';
import { AwsModule } from '@platform/adapters-aws/nest';
import { TelemetryBootstrap } from '@platform/observability/setup';
import { DatabaseAuth, DatabaseTokenProvider } from '@platform/persistence';
import { PersistenceModule } from '@platform/persistence/nest';
import { InvalidServiceDefinitionError } from '../../../errors/invalid-service-definition.error.js';
import { ServiceDefinitionBuilder } from '../../../__tests__/utils/index.js';
import { ImportedModules } from '../../runtime/__tests__/utils/index.js';
import { MigrationHostModule } from '../migration-host.module.js';

describe('MigrationHostModule', () => {
  const definition = ServiceDefinitionBuilder.aDefinition().build();
  const telemetry = TelemetryBootstrap.startWith({
    serviceName: definition.name,
    disabled: true,
  });

  it('migrates with only PostgreSQL when the pool uses a password', () => {
    const dynamic = MigrationHostModule.forService(definition, {}, telemetry);

    expect(ImportedModules.of(dynamic)).not.toContain(AwsModule);
  });

  it('signs the owner tokens with the RDS signer of AWS when DB_AUTH=iam', () => {
    const dynamic = MigrationHostModule.forService(
      definition,
      { DB_AUTH: DatabaseAuth.Iam, AWS_REGION: 'us-east-1' },
      telemetry,
    );

    expect(ImportedModules.find(dynamic, AwsModule)?.providers).toContainEqual(
      expect.objectContaining({ provide: RdsIamDatabaseTokenProvider }),
    );
    expect(
      ImportedModules.find(dynamic, PersistenceModule)?.providers,
    ).toContainEqual({
      provide: DatabaseTokenProvider,
      useExisting: RdsIamDatabaseTokenProvider,
    });
  });

  it('refuses DB_AUTH=iam without AWS_REGION', () => {
    expect(() =>
      MigrationHostModule.forService(
        definition,
        { DB_AUTH: DatabaseAuth.Iam },
        telemetry,
      ),
    ).toThrow(InvalidServiceDefinitionError);
  });
});
