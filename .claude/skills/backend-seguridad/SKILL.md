---
name: backend-seguridad
description: Reglas de seguridad del backend de node_template. Validación de entrada con zod, autenticación JWT y sesiones, autorización por permisos con enums y por tenant, aislamiento entre tenants, secretos, hash de contraseñas, límites de tasa y tamaño, cabeceras, inyección SQL, datos sensibles en logs y dependencias. Úsala al exponer un endpoint, un consumidor, una consulta, o al manejar credenciales, tokens o datos personales.
---

# Seguridad

Contexto: ADR 0005 (autenticación), 0006 (MFA), 0010 (sharding por tenant), 0016 (egress), 0022 (revocación de tokens). Estas reglas se suman a ellos.

## Entrada

- Todo dato que cruza una frontera (HTTP, mensaje, job, variable de entorno) se valida con el esquema zod del contrato antes de usarse. Es `unknown` hasta entonces.
- Esquemas estrictos: `z.strictObject` para rechazar campos desconocidos, longitudes máximas en cadenas, límites en números y arreglos, `uuid` para ids.
- Lista blanca en la entrada y en la salida. Un endpoint nunca devuelve una entidad completa: arma el DTO campo por campo, así un campo nuevo no se filtra por accidente.
- Tamaño máximo de cuerpo y de carga por ruta. Subidas de archivos con tipo MIME y tamaño validados y almacenadas fuera del servidor de aplicación.
- Sin `eval`, `new Function` ni `require` con ruta variable. Sin expresiones regulares que retrocedan catastróficamente sobre entrada del usuario (se valida el largo antes).
- Redirecciones solo a destinos de una lista permitida. El egress de red pasa por el cliente de plataforma con lista permitida (ADR 0016) para evitar SSRF.

## Autenticación

- Contraseñas con Argon2id (o scrypt) por un puerto `PasswordHasher`, con el costo en configuración. Comparación en tiempo constante. Nunca MD5, SHA simple ni cifrado reversible.
- JWT de vida corta, con `iss`, `aud`, `exp`, `rgn` y el tenant. Algoritmo fijado en la verificación, nunca tomado del encabezado del token. Las claves rotan con `kid`.
- Revocación por estado compartido (ADR 0022). El refresh token es opaco, de 256 bits aleatorios (`crypto.randomBytes`), se guarda con hash y rota en cada uso.
- Fuerza bruta: límite de tasa por cuenta y por IP en el login, bloqueo progresivo y respuesta idéntica para usuario inexistente y contraseña incorrecta.
- MFA y dispositivos registrados según ADR 0006.

## Autorización

- Deny by default. Un guard global exige autenticación; una ruta pública se declara con un decorador explícito.
- Los permisos son un enum (`Permission.UsersWrite`), nunca cadenas. Se declaran por ruta con un decorador y los evalúa un guard.
- La autorización de objeto se comprueba en el caso de uso, con el actor y el recurso: tener el permiso `UsersWrite` no basta para escribir el usuario de otro tenant.
- El tenant sale del token verificado, nunca de un parámetro, cuerpo o cabecera del cliente. Cada consulta lleva la llave de shard del tenant del actor.
- Un acceso a un recurso ajeno responde 404 si la existencia es sensible, 403 si no.
- Las acciones sensibles (cambio de email, permisos, borrado) generan evento de auditoría con actor, tenant, recurso y traza.

## Datos

- Consultas siempre parametrizadas, con TypeORM o `QueryBuilder` con parámetros nombrados. Nunca se concatena entrada en SQL, ni en nombres de columna u orden: el orden se elige de una lista blanca.
- Las columnas sensibles (documentos, teléfonos) se cifran a nivel de campo con llaves gestionadas por KMS, y los índices de búsqueda usan HMAC, no el valor.
- Secretos, tokens y datos personales nunca van en logs, mensajes de error, URLs, trazas ni eventos de dominio. El logger redacta campos conocidos (`password`, `token`, `authorization`).
- Los UUIDv7 revelan el instante de creación. En identificadores públicos donde eso importe, se agrega un identificador opaco.

## Secretos y configuración

- Los secretos vienen de Secrets Manager o del entorno, se leen una vez en el arranque por la configuración validada y se inyectan como valor. Nunca en el repositorio, en pruebas ni en imágenes.
- `.env.example` documenta variables sin valores reales.
- Las pruebas usan valores generados, nunca los reales.

## Transporte y cabeceras

- Solo HTTPS. CORS con lista explícita de orígenes, nunca `*` con credenciales.
- Cabeceras de seguridad con `helmet` (o el equivalente de Fastify). Sin `X-Powered-By`.
- Límite de tasa global y por ruta sensible, con la respuesta 429 y `Retry-After`.
- Los errores no revelan tecnología, rutas ni consultas: ver `backend-errores`.

## Dependencias y ejecución

- Versiones exactas y `pnpm install --frozen-lockfile` en CI. Análisis de vulnerabilidades en CI. Pocas dependencias, cada una detrás de un puerto (ver `backend-estructura`).
- Contenedor con usuario sin privilegios, imagen mínima, sin secretos en `ARG` ni en capas.
- `@aws-sdk/*` solo en `backend/libs/platform/adapters/aws`, con roles de mínimo privilegio por servicio.

## Revisión

```
- [ ] Esquema zod estricto en cada borde nuevo
- [ ] Permiso por enum y comprobación de objeto y tenant en el caso de uso
- [ ] Respuesta armada con lista blanca
- [ ] Sin SQL por concatenación
- [ ] Sin secretos ni datos personales en logs
- [ ] Límite de tasa en rutas de credenciales o costosas
- [ ] Evento de auditoría en acciones sensibles
```
