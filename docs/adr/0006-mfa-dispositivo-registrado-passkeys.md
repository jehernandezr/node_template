# 0006. MFA con dispositivo registrado y passkeys

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

Una contraseña robada no debe bastar para entrar desde un dispositivo nuevo. Al mismo tiempo, un usuario con su dispositivo a mano no debería escribir un código en cada login.

## Decisión

MFA obligatorio al registrar cualquier dispositivo nuevo, para todos los usuarios. En cada login, MFA solo para administradores de tenant y de backoffice.

- Registro: la app genera un par de claves en Secure Enclave, Android Keystore o WebCrypto (no exportable) y envía la clave pública.
- Login desde un dispositivo registrado: el servidor envía un challenge, la app lo firma y genera el código de 8 dígitos sin intervención del usuario. Vence en 2 a 3 minutos.
- Primer dispositivo: código de 6 dígitos por email, con vencimiento de 5 minutos.
- Cada código se guarda como HMAC, es de un solo uso, admite 5 intentos por challenge y 3 challenges cada 15 minutos.
- Passkeys desde la primera versión (WebAuthn con `@simplewebauthn/server`). En backoffice son el método recomendado.
- Recuperación sin dispositivo por email, con espera exponencial de 24 h, 48 h y 96 h.
- Operaciones sensibles usan step-up: `mfa: { maxAgeMinutes: 10 }`.

## Consecuencias

Positivas:

- El usuario con un dispositivo registrado entra sin escribir códigos.
- Una passkey en un dispositivo registrado cumple los dos factores.
- La espera creciente en la recuperación frena el secuestro de cuentas por email.

Costos:

- Si el usuario pierde el dispositivo registrado, la recuperación tarda al menos 24 horas.
- La app debe manejar claves del dispositivo en iOS, Android y web.

## Alternativas consideradas

- Código por email como método de login: el documento lo retira cuando hay un dispositivo registrado.
- TOTP y códigos de recuperación: quedan como respaldo, no como método principal.
