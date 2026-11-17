# Rotación de las claves de firma de identity

Identity firma los access tokens con ES256. Las claves viven en la variable `IDENTITY_SIGNING_KEYS`, que en AWS sale de un secreto de Secrets Manager declarado en `secrets` del stack del servicio. Los demás servicios verifican con el JWKS público (`GET /v1/auth/jwks`) y nunca ven la clave privada ([ADR 0022](../adr/0022-verificacion-de-tokens-y-estado-de-revocacion-compartido.md)).

## Cómo se leen las claves

`IDENTITY_SIGNING_KEYS` es un arreglo JSON de JWK privados P-256 (`kty: EC`, `crv: P-256`, `d`, `x`, `y`), cada uno con su `kid` y un `status` opcional:

| `status`    | Firma tokens nuevos | Se publica en el JWKS | Uso                                                       |
| ----------- | ------------------- | --------------------- | --------------------------------------------------------- |
| `active`    | Sí                  | Sí                    | La clave vigente. Tiene que haber exactamente una.        |
| `verifying` | No                  | Sí                    | La que entra antes de activarse o la que sale tras rotar. |
| `retired`   | No                  | No                    | Una clave comprometida o vencida.                         |

Sin `status`, la primera clave del arreglo es la activa y las demás quedan como `verifying`. Identity no arranca si no hay una sola activa o si dos claves repiten `kid`.

## Tiempos que mandan

| Tiempo                           | Valor                                  | De dónde sale                                             |
| -------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| Vida del access token            | Entre 10 y 15 min (`ACCESS_TOKEN_TTL`) | Configuración de identity                                 |
| Caché del JWKS en cada servicio  | 5 min                                  | `RemoteJwksKeySource.TTL_MS` de `@platform/auth`          |
| Recarga por un `kid` desconocido | Como mucho una cada 30 s               | `RemoteJwksKeySource.MIN_RELOAD_MS`                       |
| Caché HTTP del JWKS              | `Cache-Control: public, max-age=300`   | Respuesta de `GET /v1/auth/jwks`                          |
| Convivencia de la clave que sale | 30 min                                 | Este runbook: cubre la vida máxima del token más la caché |

## Rotación planeada

Se hace en tres despliegues. Entre uno y otro se respeta la espera indicada.

1. **Generar la clave nueva** en una máquina de confianza, nunca en CI ni en un chat:

   ```sh
   node -e "const c=require('node:crypto');const {privateKey}=c.generateKeyPairSync('ec',{namedCurve:'P-256'});console.log(JSON.stringify({...privateKey.export({format:'jwk'}),kid:c.randomBytes(8).toString('base64url'),status:'verifying'}))"
   ```

2. **Publicarla como `verifying`.** Agregar el JWK al final del arreglo del secreto, sin tocar la clave activa, y desplegar identity. Comprobar que `GET /v1/auth/jwks` lista los dos `kid`. Esperar al menos 5 minutos para que todos los servicios tengan el JWKS nuevo en caché.
3. **Activarla.** Cambiar la nueva a `active` y la anterior a `verifying`, y desplegar. Desde ese momento los tokens nuevos llevan el `kid` nuevo y los anteriores siguen verificando.
4. **Retirar la anterior.** Pasados 30 minutos, cambiar la anterior a `retired` (o quitarla del arreglo) y desplegar. Ya no queda ningún token vigente firmado con ella.

Si un paso falla, se vuelve al arreglo del paso anterior: mientras la clave que sale siga en `verifying`, ningún token deja de verificar.

## Rotación de emergencia

Cuando una clave privada queda expuesta:

1. Generar una clave nueva como en el paso 1 de la rotación planeada, con `status: 'active'`.
2. En el mismo cambio del secreto, marcar la comprometida como `retired` y desplegar identity. El JWKS deja de publicarla y los tokens nuevos salen con la clave nueva.
3. Reiniciar los demás servicios, o esperar 5 minutos, para que su caché del JWKS deje de aceptar el `kid` retirado. Mientras tanto, un token firmado con esa clave sigue verificando en una réplica con la caché vieja.
4. Si hay indicios de tokens forjados, revocar además por época: la operación interna `identity.sessions.revoke-for-user.v1` para los usuarios afectados, o la suspensión del tenant, que rechazan todo token emitido antes del momento de la revocación.

Los clientes no pierden la sesión: el session token es opaco y no depende de la clave de firma, así que el siguiente refresh emite un access token con la clave nueva.

## Comprobaciones

- `GET /v1/auth/jwks` responde 200 con los `kid` esperados y nunca incluye `d`.
- Los logs de los servicios no muestran picos de `PLATFORM.AUTH.UNAUTHENTICATED` después de cada despliegue.
- La clave privada no aparece en el repositorio, en los logs ni en el historial de la terminal: el secreto se edita en Secrets Manager.
