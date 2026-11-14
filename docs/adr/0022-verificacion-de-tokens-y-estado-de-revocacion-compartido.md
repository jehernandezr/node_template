# 0022. Verificación de tokens y estado de revocación compartido

- Estado: Propuesta
- Fecha: 2026-11-13

## Contexto

El ADR 0005 decide que identity emite los tokens y que los demás servicios solo los verifican, revisando firma, expiración, sesión, épocas y versión de permisos. Falta decidir dónde vive esa verificación, de dónde leen los servicios el estado de revocación y qué claims necesita el token para hacerlo sin llamar a identity. Hoy cada servicio solo puede leer las llaves de Valkey con su propio prefijo (ADR 0020 y 0021), así que ningún servicio vería una sesión revocada por identity.

## Decisión

`backend/libs/platform/auth` (`@platform/auth`) verifica el access token y arma el `Actor` en cualquier servicio, sin NestJS. La entrada HTTP (`@platform/http`) la usa en su guard.

- Firma y verificación ES256 y JWKS con `node:crypto` (`dsaEncoding: 'ieee-p1363'`, JWK por `KeyObject`). Sin librería de JWT.
- Header `{ alg: 'ES256', typ: 'at+jwt', kid }`. Claims: `iss`, `aud`, `sub`, `tid`, `htid` (tenant de origen, ADR 0023), `sid`, `did`, `amr`, `auth_time`, `roles`, `proles` (roles de plataforma), `pv` (`"<versión del tenant>.<versión del usuario>"`), `rgn`, `sxp` (tope absoluto de la sesión), `iat`, `exp`, `jti`. El esquema vive en `@contracts/identity`.
- Orden de revisión: formato, firma, emisor y audiencia, expiración (`PLATFORM.AUTH.TOKEN_EXPIRED`), tope de sesión, sesión revocada, época del usuario, época del tenant, versión de permisos. Los códigos son los de `SessionGuardErrors`.
- Identity escribe el estado de revocación en el espacio `auth:*` de Valkey, sin prefijo de servicio: `auth:revoked:{sid}` con su índice `auth:revoked-index`, `auth:epoch:user:{id}`, `auth:epoch:tenant:{id}`, `auth:pv:*`, `auth:access:{tid}:{uid}`, `auth:apikey:{prefix}` y el canal `auth:revocations`.
- La ACL de Valkey del stack `data` da a identity lectura y escritura sobre `auth:*`, y a los demás servicios solo lectura (`%R~auth:*`) y suscripción a `auth:revocations`.
- Cada proceso mantiene un Bloom en memoria de sesiones revocadas, alimentado por el canal y reconstruido cada 10 s desde el índice, y una caché local de 5 s para épocas y versiones. Si Valkey no responde y no hay valor en caché, el verificador responde 503 en lugar de aceptar el token.
- `@platform/auth` y `@platform/http` pueden importar `@contracts/identity` (excepción explícita en `backend/eslint.config.mjs`): el formato del token y sus códigos son contrato de identity.

## Consecuencias

### Positivas

- Ningún servicio llama a identity para autenticar una petición.
- Una revocación llega a todos los procesos en milisegundos por el canal, y en a lo sumo 10 s si un proceso perdió el aviso.
- Un solo verificador para HTTP, consumidores y el gateway de tiempo real.

### Costos

- El espacio `auth:*` rompe la regla de "cada servicio ve solo su prefijo"; se acota a lectura.
- Los claims nuevos (`htid`, `proles`, `pv` como par, `sxp`) amplían lo que el plan lista.
- Mantener código criptográfico propio exige vectores de prueba de los RFC y casos de tokens alterados.

## Alternativas consideradas

- Cada servicio consume `TokensRevoked` por su cola y guarda una copia bajo su prefijo: la cola entrega a un solo consumidor por servicio y la revocación tiene que llegar a todos los procesos.
- Introspección en identity por petición: suma latencia y hace de identity un punto único de falla.
- Librería `jose`: correcta, pero `node:crypto` cubre ES256 y JWK con poco código propio.
