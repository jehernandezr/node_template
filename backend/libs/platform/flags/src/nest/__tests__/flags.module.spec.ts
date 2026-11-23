import { Test } from '@nestjs/testing';
import { ConfigModule } from '@platform/config/nest';
import { FlagEvaluator } from '../../flag-evaluator.js';
import { FlagsModule } from '../flags.module.js';

describe('FlagsModule', () => {
  it('evaluates the flags declared in FEATURE_FLAGS', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          env: {
            FEATURE_FLAGS: JSON.stringify([
              { flag: 'new_reports', enabled: true, tenants: ['tenant-a'] },
            ]),
          },
        }),
        FlagsModule.forRoot(),
      ],
    }).compile();

    const evaluator = moduleRef.get(FlagEvaluator);

    await expect(
      evaluator.enabledFlags({ tenantId: 'tenant-a', userId: 'user-a' }),
    ).resolves.toEqual(['new_reports']);
    await moduleRef.close();
  });
});
