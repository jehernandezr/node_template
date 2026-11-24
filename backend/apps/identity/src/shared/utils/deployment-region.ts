import { Injectable } from '@nestjs/common';
import { ServiceRegions } from '@platform/service';
import { IdentitySettings } from '../../config/identity-settings.js';

/** La región de este despliegue de identity y la URL de su API, para que el cliente llame a la región correcta. */
export interface RegionLocation {
  readonly region: string;
  readonly apiBaseUrl?: string;
}

/** Dónde atiende este despliegue: `IDENTITY_REGION` y, si `REGIONS` la declara, su `apiBaseUrl`. */
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
