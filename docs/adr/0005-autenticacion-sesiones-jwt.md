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

## Consecuencias

Positivas:

- Una sesión se puede revocar al instante, aunque el access token siga vigente hasta su `exp`.
- La plataforma no depende de un proveedor externo de identidad.

Costos:

- La plataforma es responsable de la rotación de claves, el bloqueo por intentos y la invalidación de tokens.
- El guard consulta Valkey en cada petición. Se mitiga con caché de pocos segundos y un Bloom filter delante.

## Alternativas consideradas

- Auth del template original (JWT, Sequelize y bcrypt): se descarta por los hallazgos de seguridad listados en el punto de partida.
