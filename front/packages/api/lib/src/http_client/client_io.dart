import 'package:http/http.dart' as http;

/// Client of the platform. Outside the browser the cookies are not managed
/// by the client, so [withCredentials] has no effect.
http.Client createPlatformClient({required bool withCredentials}) =>
    http.Client();
