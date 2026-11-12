# 0014. Acuerdos y documentos firmados

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

La plataforma debe registrar que un usuario o un tenant aceptó términos, dio consentimientos o firmó un documento, con evidencia suficiente. Cada producto que reimplementa esto por su cuenta repite trabajo y arriesga la validez legal.

## Decisión

`apps/agreements` es un servicio genérico para cualquier documento que haya que aceptar o firmar.

- Tipos de acuerdo en el enum `AgreementType`: `TermsOfService`, `PrivacyPolicy`, `DataProcessingConsent`, `MarketingConsent`, `FeatureTerms` y `Contract`, ampliable.
- Cada versión de documento es inmutable, con su hash SHA-256 y su vigencia. Un cambio mayor exige aceptar de nuevo; uno menor solo se notifica.
- La audiencia puede ser todos, un tenant, un plan, un rol, un grupo, una feature o un país.
- Un endpoint declara sus acuerdos. Si falta alguno, responde `LEGAL.AGREEMENT.ACCEPTANCE_REQUIRED`.
- Aceptar publica `AgreementsEvent.Accepted`, que puede habilitar permisos. Revocar publica `AgreementsEvent.Revoked`.
- Cada aceptación genera un paquete PDF de evidencia guardado con S3 Object Lock.

## Consecuencias

Positivas:

- Un solo lugar guarda consentimientos, versiones y evidencia.
- Los permisos dependen de lo que el usuario aceptó.

Costos:

- Los textos y el nivel de firma de cada acuerdo deben validarse con asesoría legal.
- La firma digital certificada depende de un proveedor externo conectado por el puerto `DigitalSignatureProvider`.

## Alternativas consideradas

- Solo clic en "Acepto": es el método de menor evidencia. No basta cuando el acuerdo exige más.
- Clic con código de verificación, o firma con la clave del dispositivo registrado: son niveles intermedios de evidencia.
