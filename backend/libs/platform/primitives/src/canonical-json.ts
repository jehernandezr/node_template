import { CanonicalJson } from './canonical-json/canonical-json.js';

export type { CanonicalJsonValue } from './canonical-json/canonical-json.js';

/** @deprecated Usa `CanonicalJson.MAX_DEPTH`. */
export const MAX_CANONICAL_JSON_DEPTH = CanonicalJson.MAX_DEPTH;

/** @deprecated Usa `CanonicalJson.canonicalize`. */
export const canonicalize = CanonicalJson.canonicalize;

/** @deprecated Usa `CanonicalJson.stringify`. */
export const canonicalJson = CanonicalJson.stringify;

/** @deprecated Usa `CanonicalJson.digest`. */
export const stableDigest = CanonicalJson.digest;
