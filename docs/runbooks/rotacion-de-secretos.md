# Rotación de secretos de servicio

Los secretos de cada servicio salen de Secrets Manager por el bloque `secrets` del stack del servicio y llegan como variables de entorno. Ninguno se escribe en el repositorio. Las claves de firma de identity tienen su propio runbook: [rotación de las claves de identity](rotacion-claves-identity.md).

## Secreto de la API interna

`INTERNAL_API_SHARED_SECRET` firma con HMAC las llamadas internas cuando `INTERNAL_API_SIGNER=hmac` (local y pruebas). En AWS las llamadas se firman con SigV4 y el rol de cada servicio, así que no hay secreto que rotar.

Con HMAC el secreto es uno solo para todos los servicios: rotarlo es un corte. Hazlo en una ventana sin sagas corriendo:

1. Genera el valor nuevo (`openssl rand -base64 32`) y guárdalo en el secreto.
2. Despliega los cinco servicios a la vez. Mientras conviven versiones, una llamada firmada con el secreto viejo responde 401 y la saga la reintenta después.
3. Revisa que ninguna saga quedó en `RequiresIntervention` por llamadas rechazadas.

## Pimientas y claves de datos de identity

`IDENTITY_EMAIL_PEPPER`, `IDENTITY_TOKEN_PEPPER`, `IDENTITY_API_KEY_PEPPER`, `IDENTITY_DEVICE_ID_KEY` e `IDENTITY_DATA_KEY` protegen datos guardados: cambiarlas deja ilegibles los hashes o el cifrado existentes. No se rotan en el lugar. Si una se compromete, trátalo como un incidente: invalida las sesiones y las API keys, y planea una migración que vuelva a calcular cada valor con la nueva.

## Credenciales de base

`DB_CREDENTIALS` llega del secreto que RDS rota. El RDS Proxy toma la credencial nueva sin cortar conexiones; los servicios la leen al arrancar. Tras una rotación, reinicia las tareas de forma escalonada y revisa `GET /health/ready`.
