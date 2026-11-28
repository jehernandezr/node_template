import { SigningKeySetGenerator } from '../../domain/signing-key-set-generator.js';

/** Returns the same key set text every time. */
export class FixedSigningKeySetGenerator extends SigningKeySetGenerator {
  constructor(private readonly keySet: string) {
    super();
  }

  override generate(): string {
    return this.keySet;
  }
}
