---
name: front-seguridad
description: Seguridad del código del front de node_template (Flutter, web y móvil). Secretos, almacenamiento de tokens, HTTPS, validación de entrada, logs, aleatoriedad y dependencias. Úsala al tocar sesión, tokens, ApiClient, almacenamiento local, configuración por entorno, deep links o al agregar una dependencia.
paths:
  - 'front/packages/auth/**'
  - 'front/packages/api/**'
  - 'front/apps/**'
---

# Seguridad del front

Todo lo que llega a un cliente es recuperable por quien lo tenga. La interfaz oculta lo que el usuario no puede usar, pero la autoridad es la API (ADR 0012 y 0018). Esta skill cubre lo que se ve leyendo el código.

## Reglas

- **Secretos:** ninguna clave de API privada, token de servicio ni contraseña en el código, en un asset, en un `.env` ni en `--dart-define`. Todo eso queda en el binario o en el bundle y se extrae. Lo único que se pasa por `--dart-define` es configuración pública (`API_BASE_URL`). Si el cliente necesita un secreto, el servidor lo sirve con una operación autenticada.
- **Tokens:** el session token de web es una cookie `httpOnly` (`CookieTokenStore`), que el cliente no lee. En móvil el adaptador real usa Keychain y Keystore detrás del puerto `TokenStore`; hoy vive en memoria, y se documenta así. Nunca `SharedPreferences`, archivos ni `localStorage` para tokens, sesión o datos personales.
- **Red:** solo HTTPS. Nunca `badCertificateCallback` que devuelva `true` ni un cliente HTTP con la validación apagada. Todo pasa por `ApiClient`; en modo vivo, `IdentityConnection` es dueña del transporte (corta cada petición a los 30 s) y refresca con `SessionRefreshPolicy`. Quien necesite otro cliente lo justifica en el PR.
- **Autorización:** `AccessRule`, `AccessGate` y `context.can` son comodidad de interfaz. El servidor responde 401 o 403 y el cliente lo trata (cierra sesión con los códigos de `IdentityConnection.refreshCodes`).
- **Entrada:** lo que viene de un deep link, de `params` o del portapapeles se valida antes de usarlo, con los validadores generados en `contracts`. No se arma una URL ni una consulta concatenando texto sin codificar: `Uri(...)` con `pathSegments` y `queryParameters`.
- **Datos entre identidades:** nada de un usuario sobrevive a un cambio de identidad (repositorios `ScopedResource`, `identityEpoch`). Una caché en una variable de nivel superior es un fallo de seguridad.
- **Logs:** sin `print` ni `debugPrint` de tokens, correos, cuerpos de petición o respuesta. Los errores se muestran por código (`showActionError`), no con el texto crudo de la excepción.
- **Aleatoriedad:** `Random.secure()` para cualquier identificador, nonce o desafío. `Random()` solo para efectos visuales.
- **Criptografía:** nunca propia. Hashing con `package:crypto` solo cuando de verdad se necesita en el cliente; las contraseñas no se hashean en el cliente.
- **Dependencias:** cada paquete nuevo con versión exacta, mantenido y con licencia compatible. Antes de un release se revisa `pubspec.lock` con `osv-scanner` y no se silencia un aviso sin justificación escrita.
- **Biometría o segundo factor:** solo con el plugin oficial (`local_auth`) detrás de un puerto, no con un `MethodChannel` propio.
- **Plataforma:** `android:allowBackup="false"` en el manifiesto de la app móvil, y sin permisos que la función no use.

## Ejemplo

```dart
Uri taskUri(String id, {TaskStatus? status}) => Uri(
  pathSegments: ['v1', 'tasks', id],
  queryParameters: {if (status != null) 'status': status.wire},
);
```

## Informe de una revisión

Cada hallazgo es Critical (secreto en el binario, validación TLS apagada, token en almacenamiento en claro, datos sensibles en logs), Warning (sin validación de entrada, `Random()` en un identificador, backup habilitado) o Note (dependencia desactualizada, ofuscación ausente). Cada uno trae archivo, regla y el código corregido.
