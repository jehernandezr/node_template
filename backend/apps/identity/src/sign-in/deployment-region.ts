import { Injectable } from '@nestjs/common';
import { ServiceRegions } from '@platform/service';
import { IdentitySettings } from '../../config/identity-settings.js';

/** The region of this identity deployment and its API URL, so the client calls the right region. */
export interface RegionLocation {
  readonly region: string;
  readonly apiBaseUrl?: string;
}

/** Where this deployment serves: `IDENTITY_REGION` and, if `REGIONS` declares it, its `apiBaseUrl`. */
@Injectable()
export class DeploymentRegion {
  constructor(
    private readonly settings: IdentitySettings,
    private readonly regions: ServiceRegions,
  ) {}

  location(): RegionLocation {
    const region = this.settings.values.IDENTITY_REGION;
    const apiBaseUrl = this.regions.apiBaseUrlOf(region);
    return apiBaseUrl === undefined ? { region } : { region, apiBaseUrl };
  }
}
