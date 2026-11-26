import { Injectable } from '@nestjs/common';
import { ServiceRegions } from '@platform/service';
import { IdentitySettings } from '../config/identity-settings.js';
import type { RegionLocation } from '../shared/types/region-location.type.js';

/** Where this deployment serves: `IDENTITY_REGION` and, if `REGIONS` declares it, its `apiBaseUrl`. */
@Injectable()
export class DeploymentRegion {
  constructor(
    private readonly settings: IdentitySettings,
    private readonly regions: ServiceRegions,
  ) {}

  /**
   * Returns this deployment's region and, if declared, its API URL.
   * @returns The region location.
   */
  location(): RegionLocation {
    const region = this.settings.values.IDENTITY_REGION;
    const apiBaseUrl = this.regions.apiBaseUrlOf(region);
    return apiBaseUrl === undefined ? { region } : { region, apiBaseUrl };
  }
}
