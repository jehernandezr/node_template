# 0005. Autenticación propia con sesiones y JWT

- Estado: Aceptada
- Fecha: 2026-11-11

## Contexto

El template original guarda secretos en el repositorio, acepta el rol desde el body del signup, lee la contraseña antes de validar el usuario y guarda claves sin hash. La plataforma necesita identidad propia que permita revocar sesiones sin esperar a que expire un token.

## Decisión

El servicio `identity` emite y controla toda la identidad. Los demás servicios solo verifican.

- Access token: JWT ES256 de 10 a 15 minutos, verificable sin estado con la clave pública del JWKS.
- Session token: opaco, guardado como hash en la tabla `sessions`. Cada refresh lo rota, y reusar uno anterior revoca la sesión completa.
- Vencimiento: la sesión vence tras 1 día sin actividad. Cada refresh extiende la ventana un día, con tope absoluto de 30 días.
- Contraseñas con argon2id. Cambiar la contraseña revoca las demás sesiones.
- En web, el session token va en cookie `httpOnly`, `Secure` y `SameSite=Strict`. En móvil, va en Keychain o Keystore.
- El guard revisa en orden la firma, la expiración, la sesión, las épocas de usuario y tenant, y la versión de permisos.

### Rutas del contrato

El contrato `@contracts/identity` publica el ciclo de la sesión:

- `POST /v1/auth/refresh` (`identity.auth.refresh`, pública): recibe `{ sessionToken? }` y responde `SessionTokens`. En móvil el session token viaja en el cuerpo y la respuesta trae el siguiente. En web el cuerpo va vacío, el token viaja en la cookie, el servidor la reemplaza con `Set-Cookie` y la respuesta no trae `sessionToken`.
- `POST /v1/auth/sign-out` (`identity.auth.sign-out`, pública): recibe el mismo `{ sessionToken? }`, revoca la sesión, borra la cookie en web y responde 204. Es idempotente.
- Paso adicional de una sesión abierta, con los tipos del MFA del login y acceso autenticado: `POST /v1/me/step-up` responde `PendingMfa` con un `mfaToken` atado a la sesión y los métodos que ofrece; `POST /v1/me/step-up/challenges` recibe `MfaChallengeRequest` y responde `MfaChallenge`; `POST /v1/me/step-up/verify` recibe `StepUpVerifyRequest` (sin clave de dispositivo) y responde `StepUpResult`, con un access token nuevo que lleva `auth_time` y `amr` al día y el nuevo `mfaVerifiedAt` de la sesión. El session token no cambia.

### Códigos de invalidación

Cada mecanismo de invalidación tiene su código público, con mensaje en es y en:

| Código                      | HTTP | Cuándo                                                                                            |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------- |
| `IDENTITY.SESSION.REVOKED`  | 401  | La sesión fue revocada (logout, cierre remoto, cambio de contraseña, acción de un administrador). |
| `IDENTITY.SESSION.EXPIRED`  | 401  | La sesión venció por inactividad o por el tope absoluto.                                          |
| `IDENTITY.SESSION.REUSED`   | 401  | Se presentó un session token ya rotado; la sesión completa queda revocada.                        |
| `IDENTITY.TOKEN.REVOKED`    | 401  | El access token cae bajo la época del usuario o del tenant.                                       |
| `IDENTITY.USER.SUSPENDED`   | 403  | El usuario está suspendido.                                                                       |
| `IDENTITY.TENANT.SUSPENDED` | 403  | El tenant está suspendido.                                                                        |

El refresh responde los de sesión y las suspensiones. El guard de toda ruta autenticada responde la sesión revocada o vencida, el token revocado, las suspensiones e `IDENTITY.TOKEN.STALE_PERMISSIONS`. El cliente cierra la sesión ante cualquiera de los seis, venga del refresh o de otra ruta; ante `STALE_PERMISSIONS` refresca y reintenta. Un método que el desafío MFA no ofreció responde `IDENTITY.MFA.METHOD_UNAVAILABLE` (400).

## Consecuencias

Positivas:

- Una sesión se puede revocar al instante, aunque el access token siga vigente hasta su `exp`.
- La plataforma no depende de un proveedor externo de identidad.

Costos:

- La plataforma es responsable de la rotación de claves, el bloqueo por intentos y la invalidación de tokens.
- El guard consulta Valkey en cada petición. Se mitiga con caché de pocos segundos y un Bloom filter delante.

## Alternativas consideradas

- Auth del template original (JWT, Sequelize y bcrypt): se descarta por los hallazgos de seguridad listados en el punto de partida.
