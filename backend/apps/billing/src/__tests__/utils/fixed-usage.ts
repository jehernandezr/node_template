import { UsageFacade, type UsageLevel } from '../../modules/usage/index.js';

/** Usage of the current period fixed by the test. */
export class FixedUsage extends UsageFacade {
  levelsOfPeriod: readonly UsageLevel[] = [];

  override async levels(): Promise<readonly UsageLevel[]> {
    return this.levelsOfPeriod;
  }
}
