# 0014. Agreements and signed documents

- Status: Accepted, not built
- Updated: 2026-11-24 (status of what is built)
- Date: 2026-11-11

## Context

The platform must record that a user or a tenant accepted terms, gave consents or signed a document, with sufficient evidence. Each product that reimplements this on its own repeats work and puts legal validity at risk.

## Decision

`apps/agreements` is a generic service for any document that has to be accepted or signed.

- Agreement types in the `AgreementType` enum: `TermsOfService`, `PrivacyPolicy`, `DataProcessingConsent`, `MarketingConsent`, `FeatureTerms` and `Contract`, extensible.
- Each document version is immutable, with its SHA-256 hash and its validity period. A major change requires accepting again; a minor one is only notified.
- The audience can be everyone, a tenant, a plan, a role, a group, a feature or a country.
- An endpoint declares its agreements. If one is missing, it responds with `LEGAL.AGREEMENT.ACCEPTANCE_REQUIRED`.
- Accepting publishes `AgreementsEvent.Accepted`, which can enable permissions. Revoking publishes `AgreementsEvent.Revoked`.
- Each acceptance generates a PDF evidence package stored with S3 Object Lock.

### Status

`apps/agreements` does not exist yet and `EndpointOptions` does not declare `agreements`. What is built is the agreements section of the `account` microfrontend, which is not offered in live mode (`AccountCapability.agreements` is missing from the API repository) because there is no contract behind it.

## Consequences

Positive:

- A single place stores consents, versions and evidence.
- Permissions depend on what the user accepted.

Costs:

- The texts and the signature level of each agreement must be validated with legal counsel.
- Certified digital signature depends on an external provider connected through the `DigitalSignatureProvider` port.

## Alternatives considered

- Only a click on "Acepto": it is the method with the least evidence. It is not enough when the agreement requires more.
- A click with a verification code, or a signature with the registered device's key: these are intermediate levels of evidence.
